# Phase 2: off Supabase Auth (Cognito), then off Supabase Postgres (Neon)

Date: 2026-09-27
Status: approved direction, resequenced, not yet implemented
Depends on: Phase 1a (shipped, `docs/superpowers/specs/2026-09-26-aws-queue-workers-design.md`)

## Goal

Remove Supabase. It currently does five jobs: Postgres, Auth, Storage, Realtime,
and RLS enforcement. Phase 2 replaces the first two; Storage moves in Stage 1b
(S3), which can happen any time.

## Resequenced: 2a before 2b

The original plan was Neon and Cognito together. Splitting them is strictly
better, and the reason is specific rather than general caution.

**Supabase supports Cognito as a first-class third-party auth provider.** When
registered, Supabase trusts JWTs that Cognito signed, and `auth.uid()` reads
`sub` out of the verified token exactly as it does for a Supabase-issued one.

So Stage 2a swaps the identity provider while Postgres stays put, and **all 14
RLS policies and all 51 PostgREST query calls are untouched**. The
`auth.uid()` rewrite, the thing that carries real risk, only becomes necessary in
2b when Postgres itself moves and there is no Supabase API layer to verify a JWT.

| | Scope | Blocked on |
| --- | --- | --- |
| **2a** | Cognito replaces Supabase Auth. Postgres stays. | Cognito provisioning (ours) + two manual steps |
| **2b** | Supabase Postgres to Neon. | A Neon project and connection string |

Each stage leaves a working, deployable app.

## Measured coupling

From the current tree:

| Surface | Count | Stage that touches it |
| --- | --- | --- |
| `.from("...")` PostgREST calls | 51 across 16 files | 2b |
| `auth.getUser()` | 13 sites | 2a |
| `signUp` / `signInWithPassword` / `signOut` | 3 sites, all `app/auth/actions.ts` | 2a |
| `auth.admin.getUserById` | 2 sites | 2a |
| `auth.uid()` in RLS policies | 17 sites, 14 policies | **2b only** |
| `.storage` calls | 7 | Stage 1b |
| Realtime `.channel()` | 1 | 2b |

## Stage 2a: Cognito replaces Supabase Auth

### The non-obvious requirement

Cognito JWTs **do not contain a `role` claim**. Supabase reads `role` to decide
which Postgres role to use, so without it every request is treated as `anon` and
every `authenticated` policy silently denies. The app would appear to work and
return nothing.

The fix is a **Pre-Token Generation Lambda trigger** on the user pool that adds
`role: "authenticated"`. This is mandatory, not a nice-to-have, and it is the
single most likely thing to get wrong. Use version `V2_0` so both the access and
ID tokens carry it.

That makes a third Lambda, and it lives in `infra/` beside the two workers.

### Pieces

```text
infra/cognito.tf          user pool, app client, domain, pre-token trigger
workers/cognito-pretoken.ts   adds role: "authenticated" to every JWT
lib/cognito.ts            NEW: sign-in/up/out + token refresh against Cognito
lib/auth.ts               MODIFY: getUser() reads the Cognito session
utils/supabase/server.ts  MODIFY: pass accessToken instead of cookie session
utils/supabase/client.ts  MODIFY: same
utils/supabase/middleware.ts  MODIFY: refresh the Cognito token, not Supabase's
app/auth/actions.ts       MODIFY: signup/login/signout via Cognito
app/auth/confirm/route.ts MODIFY: Cognito confirmation code, not Supabase OTP
```

### How the Supabase client changes

Today `@supabase/ssr` owns the session and reads it from cookies. Instead, the
client is constructed with an `accessToken` callback and manages no session at
all:

```ts
createServerClient(url, publishableKey, {
  accessToken: async () => await getCognitoAccessToken(),
})
```

Session cookies become ours: a Cognito access token (1 hour) and refresh token
(30 days), both `httpOnly`, `Secure`, `SameSite=Lax`, with the refresh cookie
scoped to the refresh path. `proxy.ts` keeps doing what it does today, refreshing
before the page renders, so there is still no client-side timer and no token in
JavaScript.

### Users

Password hashes cannot move from Supabase to Cognito. There are 2 demo accounts
and a handful of real ones, so they get recreated in Cognito with
`AdminCreateUser` plus `AdminSetUserPassword` (permanent), preserving the
documented demo password.

Critically, `profiles.id` is a foreign key to `auth.users.id`. **Each recreated
Cognito user must be created with a `sub` matching the existing `profiles.id`**,
or every profile, job, and application is orphaned. Cognito does not let you
choose `sub`, so the mapping goes the other way: create the Cognito users, then
update `profiles.id` (and the FKs that reference it) to the new `sub` values in
one transaction. This is the riskiest step in 2a and needs a backup first.

`handle_new_user`, the trigger that creates a profile from signup metadata, no
longer fires because signup no longer touches `auth.users`. Profile creation
moves into the signup server action, after Cognito confirms the user.

`auth.admin.getUserById`, which the email worker uses to find an applicant's
address, becomes Cognito `AdminGetUser`. The worker's IAM role gains
`cognito-idp:AdminGetUser` on that pool only.

### Cost

Cognito is 10,000 MAU free, permanently. But Supabase charges
**$0.00325 per third-party MAU** above the plan quota. At a handful of users that
rounds to $0; it is not the unlimited-free that Supabase Auth was. Worth knowing
rather than discovering.

Also note: Supabase Auth cannot be disabled, so it stays enabled alongside
Cognito. It simply stops being used.

### Manual steps (cannot be automated from here)

1. `terraform apply` in `infra/`.
2. Register the integration in Supabase: dashboard under Authentication ->
   Third-Party Auth, or in `supabase/config.toml`:
   ```toml
   [auth.third_party.aws_cognito]
   enabled = true
   user_pool_id = "<id>"
   user_pool_region = "us-east-1"
   ```
3. Add the Cognito env vars to Vercel.

### Verification

1. Sign up a new user, confirm the profile row is created with the right role.
2. Sign in as the demo employer, load `/jobs/[id]/applicants`. If the `role`
   claim is missing this returns an empty list rather than an error, so **check
   for rows, not for a 200**.
3. Sign in as the demo applicant, confirm they see only their own applications
   (RLS still working through the Cognito JWT).
4. Apply to a job, confirm screening still runs. This exercises the Phase 1
   pipeline under the new identity provider.
5. Confirm a signed-out request to `/dashboard` still redirects.

## Stage 2b: Supabase Postgres to Neon

Start only after 2a is deployed and working.

### What has to change

**Query layer.** 51 `.from()` calls across 16 files lose PostgREST. Use `pg` with
Neon's serverless driver, which works from both Vercel and Lambda over HTTP.
Prefer a thin query module over an ORM: the queries are simple and an ORM is a
large dependency to add at the end of a migration.

**RLS context. This is the security-critical part.** `auth.uid()` does not exist
outside Supabase. Replace it with:

```sql
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;
```

Keeping the *name* `auth.uid()` means all 14 policies and 17 call sites stay
byte-identical. Only the function body changes. That is a much smaller and more
reviewable diff than rewriting every policy.

Every query must then run inside a transaction that first does
`set local app.user_id = $1`. This goes in exactly one helper that all queries
route through, never at call sites, because a single missed call site is a
cross-tenant data leak. That helper gets a test that proves an unset context
returns zero rows.

`set local` is transaction-scoped, so it cannot leak across pooled connections.
Using plain `set` instead would leak, and must not be used.

**Realtime.** The Kanban board's one `postgres_changes` subscription
(`applicants-view.tsx:124`) has no Neon equivalent. Replace with polling on the
applicants page only, or drop live updates and refresh after a stage change. The
optimistic local state already makes drag-and-drop feel instant, so the loss is
limited to seeing another user's change without a refresh.

**Data move.** `pg_dump` from Supabase, `psql` restore into Neon. Both are
Postgres 17, and `psql`/`pg_dump` 17 are already installed locally. The 9
migrations in `supabase/migrations/` port as-is except the parts that reference
`auth.users` and `storage.*`.

**Schema cleanup.** Drop the `auth` schema dependency: `profiles.id` becomes a
plain uuid primary key rather than an FK to `auth.users`, with the Cognito `sub`
as the value. The `storage.*` policies go away with Stage 1b.

### Neon free tier

0.5 GB storage per project, 100 CU-hours/month, scale-to-zero with roughly a
500 ms resume. Current data is a few MB, and resumes live in object storage, not
the database. Free, no card.

Scale-to-zero means the first request after idle waits ~500 ms. Acceptable, and
far better than Aurora Serverless v2's ~15 s, which is why Neon was chosen over
RDS.

## Out of scope

- Google sign-in. Cognito makes it a config change once the pool exists; adding
  it during a migration means two variables at once.
- An ORM.
- Replacing the GitHub Actions keep-alive with EventBridge. Note that after 2b
  the Supabase keep-alive becomes irrelevant, since Neon scale-to-zero is not a
  pause that needs preventing. **Delete the workflow at the end of 2b**, do not
  leave it pinging a dead project.

## Risks

| Risk | Mitigation |
| --- | --- |
| Missing `role` claim makes everything silently return empty | Pre-token Lambda is mandatory; verification step 2 checks for rows, not a 200 |
| `profiles.id` orphaned when users are recreated in Cognito | Back up first; remap `profiles.id` to the new `sub` in one transaction |
| A query in 2b bypasses the `set local` helper and leaks across tenants | One helper, no exceptions, plus a test asserting an unset context returns zero rows |
| Locked out of our own app mid-migration | 2a ships behind a working 1a; keep the Supabase Auth path until Cognito sign-in is verified |
| Realtime loss degrades the board | Optimistic local state already covers the interaction; only cross-user liveness is lost |
