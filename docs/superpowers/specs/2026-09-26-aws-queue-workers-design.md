# Phase 1: Background work moves to SQS + Lambda (and resumes to S3)

Date: 2026-09-26
Status: approved design, not yet implemented
Branch: `feat/aws-queue-workers`

## Goal

Replace Inngest with AWS infrastructure the repo owns and defines in Terraform,
without changing a single page, component, or RLS policy. The app keeps working
exactly as it does today; only the background tier changes hands.

This is Phase 1 of two. Phase 2 (Supabase -> Neon + Cognito) is sketched at the
bottom for context and is deliberately out of scope here.

### Why

Portfolio signal. The screening pipeline is already decoupled, queue-shaped work,
so it is the one part of this app where Lambda is the right tool rather than a
decoration. Replacing a managed job runner with our own queue topology, retry
semantics, dead-letter handling, and IaC is a stronger story than adding an HTTP
API in front of a database that already authorizes its own reads.

### Non-goals

- No HTTP API on Lambda. No API Gateway. Vercel stays the request/response
  backend; server actions and RSC keep talking to Supabase directly.
- No changes to pages, client components, `proxy.ts`, auth, or the 14 RLS
  policies.
- No Terraform for Supabase or Vercel. Terraform owns the AWS half only.

### Budget

$0/month, permanently. Verified against the live account (`094374930776`):
Lambda and SQS both report `freeTierType: "Always Free"` with current usage at
roughly 0.002% of the limits. S3 at this volume is cents. The account is on the
post-July-2025 credit model, so nothing here may depend on a 12-month free tier.

## Current state

| | |
| --- | --- |
| Trigger | `applyToJob()` sends `application/submitted` via `inngest.send` |
| Fan-out | One event drives two functions |
| Host | `POST /api/inngest` on Vercel, Node runtime, `maxDuration = 60` |
| Worker 1 | `screenApplication` - claim, load, extract, screen, persist |
| Worker 2 | `sendApplicationReceived` - Resend confirmation |
| Re-enqueue | `rescreenApplication()`, and `updateJob()` when requirements change |

Three `inngest.send` call sites: `app/applications/actions.ts:173` (apply),
`app/applications/actions.ts:225` (re-screen), `app/jobs/actions.ts:192`
(requirements changed).

### Bug this migration fixes

`sendApplicationReceived` and `screenApplication` share the
`application/submitted` trigger, and both re-enqueue paths re-send that same
event. `DECISIONS.md` records a deliberate choice not to use Inngest's
`idempotency` config, so the event is never deduped.

Result today: clicking re-screen emails the candidate "We received your
application" a second time, and editing a job's requirements emails every
applicant on that job at once.

Splitting into two queues fixes this structurally. The re-enqueue paths write to
the screening queue only, so there is no guard to forget.

## Architecture

```text
                 Vercel (Next.js: pages, RSC, server actions)
                      |                          |
       reads/writes   |                          |  SendMessage (IAM user)
                      v                          v
                 Supabase                   SQS x2
            (Postgres, Auth,        screening-queue   email-queue
             Storage, RLS)                |                |
                      ^                   v                v
                      |            screening Lambda   email Lambda
       service role   |               unpdf/mammoth      Resend
       writes results |               Anthropic
                      +-------------------+                |
                                          |                |
                                     maxReceiveCount 3      |
                                          v                v
                                   screening-dlq      email-dlq
```

Message body is `{ "applicationId": "<uuid>" }` for both queues, matching the
current event payload. The worker loads everything else from the database.

## Stage 1a: Inngest -> SQS + Lambda

Independently shippable. Ship this before starting 1b.

### Repo layout

No npm workspaces and no `packages/shared`. The Next.js app stays at the root,
and esbuild resolves the `@/` alias so the Lambda bundle pulls the existing
`lib/` modules in directly. One `package.json`, one `node_modules`, no
duplicated code.

```text
app/                      unchanged
components/               unchanged
lib/
  screening.ts            shared -> bundled into Lambda
  resume-extract.ts       shared -> bundled into Lambda
  email.ts                shared -> bundled into Lambda
  supabase/admin.ts       shared -> bundled into Lambda
  queue.ts                NEW - replaces lib/inngest/client.ts
  inngest/                DELETED
workers/
  screening.ts            NEW - SQS handler
  application-received-email.ts   NEW - SQS handler
infra/
  main.tf                 queues, DLQs, functions, event source mappings
  iam.tf                  execution roles + the Vercel publisher user
  variables.tf
  outputs.tf              queue URLs, access key id (secret marked sensitive)
```

### `lib/queue.ts`

Two exported functions, `enqueueScreening(applicationId)` and
`enqueueApplicationReceived(applicationId)`, each wrapping
`@aws-sdk/client-sqs` `SendMessageCommand`. Apply calls both. Re-screen and
`updateJob` call only `enqueueScreening`.

Keep the existing best-effort semantics: apply already committed the row and
snapshotted the resume, so a queue outage must not fail the user action. Wrap in
try/catch and log, exactly as the current code does.

For `updateJob`, which enqueues one message per applicant, use
`SendMessageBatch` (10 per call) rather than N individual sends.

### Workers

The handler signature becomes `async (event: SQSEvent)`, iterating
`event.Records`. Inside, the body of each worker is the current Inngest handler
with `step.run(...)` wrappers removed.

What stays exactly as-is and is the most important part to preserve: the first
step's atomic `PENDING | ERROR -> PROCESSING` claim. SQS standard queues are
at-least-once, so duplicate delivery is expected rather than exceptional. The
claim already makes a redelivery a no-op, and it matters more here than it did
on Inngest.

What is lost: Inngest's per-step memoization. A retry re-runs the handler from
the top instead of resuming mid-way, which means a retry after a successful AI
call pays for that call again. Acceptable at this volume, and the claim keeps it
correct. Noted as a deliberate trade.

Error handling maps as follows:

| Today | On SQS |
| --- | --- |
| `NonRetriableError` | catch, mark row `ERROR`, return normally so the message is deleted |
| transient throw | rethrow, let SQS redeliver |
| `onFailure` after retries | `maxReceiveCount: 3` moves it to the DLQ |

Report partial batch failures via `ReportBatchItemFailures` so one bad message
in a batch does not redeliver the whole batch. Set batch size to 1 for
screening (long-running, one AI call each) and leave email at the default.

### Function configuration

| | screening | email |
| --- | --- | --- |
| Runtime | `nodejs22.x` | `nodejs22.x` |
| Memory | 1024 MB | 256 MB |
| Timeout | 120 s | 30 s |
| Reserved concurrency | 5 | 5 |
| Queue visibility timeout | 720 s (6x timeout) | 180 s |
| `maxReceiveCount` | 3 | 3 |

Concurrency 5 matches the current Inngest `concurrency: { limit: 5 }` and keeps
Anthropic rate limits and Supabase connections bounded.

Free-tier headroom check: 1 GB x 30 s = 30 GB-seconds per screening, against
400,000 GB-seconds/month free. Roughly 13,000 screenings/month at $0.

### Bundling

`npm run build:workers` runs esbuild per handler:

```bash
esbuild workers/screening.ts \
  --bundle --platform=node --target=node22 --format=cjs \
  --alias:@=. --outfile=dist/screening/index.js
```

Then zip each `dist/<name>` directory. Terraform consumes the zips via
`archive_file` with `source_code_hash` so a rebuild triggers a redeploy.

Risk to verify early: `unpdf` bundles a serverless PDF.js build and
`pdfjs-dist` is large. Lambda's limits are 50 MB zipped / 250 MB unzipped. If
the screening bundle exceeds that, fall back to a Lambda layer or a container
image. Check this in the first hour, not at the end.

### Secrets

The workers need `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
`RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SITE_URL`.

Putting secret values in Lambda environment variables via Terraform writes them
in plaintext into `terraform.tfstate`. Instead:

- Store each in **SSM Parameter Store** as a `SecureString`. Standard-tier
  parameters are free; Secrets Manager is $0.40/secret/month and is not needed
  here.
- Terraform creates the parameters with values supplied from a gitignored
  `terraform.tfvars`, and grants the execution roles `ssm:GetParameters` on
  those paths only.
- The worker fetches them once at module scope (cold start) and caches for the
  container lifetime. One `GetParameters` call, roughly 10 lines, no Lambda
  extension or layer.

`terraform.tfstate` and `*.tfvars` go in `.gitignore`. State stays local for
now; a remote S3 backend is noted as a future improvement, not built.

### Vercel to AWS credentials

An IAM user with a single inline policy allowing `sqs:SendMessage` and
`sqs:SendMessageBatch` on exactly the two queue ARNs. Nothing else. Access key
id and secret go into Vercel environment variables.

Chosen over Vercel OIDC federation for effort reasons. The upgrade path
(federated role, no long-lived key) is recorded in `DECISIONS.md` as the
follow-up.

### Local development

SQS has no good local emulator and LocalStack is not worth installing for two
functions. `lib/queue.ts` checks one env flag: when `QUEUE_LOCAL=1`, it imports
the worker handler and invokes it in-process instead of calling SQS.

Same code path in production, no extra infrastructure, and `npm run dev` goes
back to a single command instead of the two terminals Inngest requires today.

Marked in-code with a `ponytail:` comment naming the ceiling: this bypasses real
queue semantics (no retry, no DLQ, no concurrency limit) and is for local
development only.

### DLQ handling

Today `onFailure` sets `screening_status = ERROR` so the UI surfaces it. On SQS
that responsibility moves into the handler's own catch: on a non-retriable
error, mark the row `ERROR` and return normally.

Messages that exhaust `maxReceiveCount` land in the DLQ. No DLQ consumer is
built. At zero users nothing should land there, and a third Lambda to drain a
queue that is expected to stay empty is speculative. Redrive is manual from the
console. A CloudWatch alarm on `ApproximateNumberOfMessagesVisible > 0` on each
DLQ is the one piece of observability worth having, and it is free.

### Deletions

- `lib/inngest/client.ts`
- `lib/inngest/functions.ts`
- `lib/inngest/email-functions.ts`
- `app/api/inngest/route.ts`
- the `inngest` dependency
- `INNGEST_DEV`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` from `.env.example`
  and the README

### Verification

1. `npm run typecheck` and `npm run lint` clean.
2. One runnable check, per the repo's existing style: a `test-queue-routing`
   assertion that apply enqueues to both queues while re-screen and `updateJob`
   enqueue to screening only. This is the duplicate-email fix and it is the one
   piece of logic that must not regress.
3. Deploy, apply to a job on the live site, confirm the row goes
   `PENDING -> PROCESSING -> DONE` and the score persists.
4. Re-screen the same application. Confirm it re-scores and that **no second
   confirmation email is sent**.
5. Send a message with a garbage `applicationId`, confirm it reaches the DLQ
   after 3 attempts.

## Stage 1b: Supabase Storage -> S3

Start only after 1a is deployed and working.

Touches `createResumeUploadUrl`, `getMyResumeUrl`, `setProfileResume` (path
string only), `applyToJob`'s snapshot copy, `lib/upload-resume.ts`,
`lib/resume-extract.ts`, and `app/api/resume/[applicationId]/route.ts`.

| Supabase Storage | S3 |
| --- | --- |
| `createSignedUploadUrl` | presigned **POST** |
| `uploadToSignedUrl` | plain `fetch` to the presigned POST |
| `storage.copy` | `CopyObject` |
| `storage.download` | `GetObject` |
| bucket `allowedMimeTypes` / `fileSizeLimit` | POST policy conditions |

Important: use presigned **POST**, not presigned PUT. `DECISIONS.md` records
that the bucket's own `allowedMimeTypes` and `fileSizeLimit` are the
authoritative validation. A presigned PUT cannot enforce a size limit; a
presigned POST can, via `content-length-range` and `Content-Type` conditions in
the policy. Dropping to PUT would silently remove a server-side guarantee the
current design deliberately relies on.

Path convention `resumes/{jobId}/{applicationId}.{ext}` carries over unchanged,
so `profiles.resume_path` and `applications.resume_path` need no migration.

Bucket is private with public access fully blocked. The screening Lambda reads
it through its execution role rather than a service-role key, which removes one
long-lived secret from the worker.

Terraform gains the bucket, its public-access block, and a lifecycle rule.

## Out of scope

- API Gateway or any HTTP Lambda.
- EventBridge Scheduler replacing the GitHub Actions keep-alive.
- SNS. It cannot send transactional email: recipients must confirm a
  subscription first, and it is plain text only, which the branded HTML
  templates in `lib/email.ts` need.
- SES. Its free tier closed to new customers on 2026-07-21, and Resend's 3,000
  emails/month free tier already works.
- Remote Terraform state.
- A DLQ consumer Lambda.

## Risks

| Risk | Mitigation |
| --- | --- |
| Screening bundle exceeds Lambda's 250 MB unzipped limit | Measure in hour one. Fall back to a layer or container image |
| Duplicate SQS delivery double-processes | Existing atomic claim already handles it. Covered by the verification step |
| Retry re-runs a paid AI call | Accepted. Batch size 1 and concurrency 5 bound the cost |
| Secrets leak into Terraform state | SSM Parameter Store; state and tfvars gitignored |
| Losing Inngest's dashboard | Accepted. CloudWatch Logs plus a DLQ alarm is the replacement, and it is worse |

## Phase 2 preview (not this spec)

Supabase is replaced by Neon (Postgres, so all 9 migrations and all 14 RLS
policies port) plus AWS Cognito for auth. The one real cost is that
`auth.uid()` is Supabase-specific, so the 17 policy call sites are rewritten to
read a claim from a Cognito-issued JWT set per transaction. Cognito is chosen
over Auth.js specifically because it issues asymmetrically signed JWTs with an
OIDC discovery URL, which is the format Neon's RLS integration expects, rather
than something hand-rolled. That work gets its own spec.
