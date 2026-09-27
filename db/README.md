# db

Schema for Neon Postgres. One consolidated file rather than a replayed history,
because there was no data to migrate off Supabase. Future changes get `0002_`,
`0003_`, and so on.

## The part that matters

**Two roles, and the difference between them is the security model.**

| Role | `rolbypassrls` | Used by |
| --- | --- | --- |
| `app_user` | **false** | All user traffic. Every RLS policy applies |
| `neondb_owner` | **true** | Admin paths only. Every policy is bypassed |

Neon hands you an owner connection string by default. **RLS does not apply to a
role with `rolbypassrls`**, so connecting the app as the owner would leave all 14
policies in place and silently enforcing nothing. That is the single easiest way
to get this wrong.

`lib/db.ts` exposes exactly two entry points, `asUser()` and `asAdmin()`, mapping
to those roles. `asUser` resolves the signed-in user itself rather than taking an
id as a parameter, because a call site that can pass an id can pass the wrong one.

## `auth.uid()`

Supabase provided `auth.uid()`, reading the `sub` claim from a JWT its API layer
verified. Ours reads a transaction-local setting instead:

```sql
select nullif(current_setting('app.user_id', true), '')::uuid
```

Keeping the **name** meant all 14 policies and 17 call sites were byte-identical
to the originals; only the function body changed.

It must be set with `SET LOCAL` (or `set_config(..., true)`), never plain `SET`.
`LOCAL` is transaction-scoped, so a pooled connection handed to the next request
cannot inherit the previous user's identity. Verified against Neon's pooler.

## First-time setup

```bash
# 1. Create the non-owner role the schema grants to.
psql "$DATABASE_URL_UNPOOLED" -c "create role app_user with login password '<pick one>';"

# 2. Apply the schema.
psql "$DATABASE_URL_UNPOOLED" -f db/migrations/0001_init.sql

# 3. Seed the demo data (needs COGNITO_USER_POOL_ID too).
node --env-file=.env.local scripts/seed.mjs
```

Then put the `app_user` connection string in `APP_DATABASE_URL`.

## Verifying it

```bash
npm run check:rls
```

Thirteen assertions, and the ones that matter are the negatives: one applicant
cannot read or update another's application, and an unset context sees nothing
but open jobs. It seeds its own fixtures and cleans up after itself.
