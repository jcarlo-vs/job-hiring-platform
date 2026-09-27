# SQS + Lambda Workers Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Inngest with two SQS queues and two Lambda functions, defined in Terraform, without touching any page, component, or RLS policy.

**Architecture:** Vercel keeps the request/response backend. `lib/queue.ts` sends to SQS; two Lambda handlers consume. Two queues instead of SNS fan-out, which also fixes the duplicate-email bug. The existing atomic `PENDING|ERROR -> PROCESSING` claim stays as the idempotency guard.

**Tech Stack:** `@aws-sdk/client-sqs`, `@aws-sdk/client-ssm`, esbuild, Terraform, Node 22 Lambda runtime.

**Spec:** `docs/superpowers/specs/2026-09-26-aws-queue-workers-design.md`

## Global Constraints

- No em dash (U+2014) or en dash (U+2013) anywhere. Hook `.claude/hooks/check-em-dash.sh` enforces this.
- Read `node_modules/next/dist/docs/` before touching Next.js APIs. This Next 16 differs from training data.
- No test framework. Checks are plain tsx scripts matching `evals/run.ts`: `console.log`, non-zero exit on failure.
- Node 22 (`.nvmrc`). Region `us-east-1`. Account `094374930776`.
- Terraform owns AWS only. Never Supabase, never Vercel.
- Nothing may depend on a 12-month AWS free tier. Always-Free services only.
- Do not change pages, client components, `proxy.ts`, auth, or any RLS policy.

---

### Task 1: De-risk the bundle size

The screening worker pulls in `unpdf` (bundled PDF.js) and `mammoth`. Lambda caps at 50 MB zipped / 250 MB unzipped. Find out now, not after six tasks of work.

**Files:**
- Create: `scripts/bundle-workers.mjs`
- Modify: `package.json` (add `build:workers`)

- [ ] **Step 1: Add esbuild**

```bash
npm i -D esbuild
```

- [ ] **Step 2: Write the bundler**

`scripts/bundle-workers.mjs`:

```js
import { build } from "esbuild";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

const WORKERS = ["screening", "application-received-email"];
const LIMIT_ZIPPED = 50 * 1024 * 1024;

rmSync("dist", { recursive: true, force: true });

for (const name of WORKERS) {
  const outdir = `dist/${name}`;
  mkdirSync(outdir, { recursive: true });

  await build({
    entryPoints: [`workers/${name}.ts`],
    outfile: `${outdir}/index.js`,
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    // The Lambda runtime provides the AWS SDK v3; bundling it wastes ~10 MB.
    external: ["@aws-sdk/*"],
    alias: { "@": "." },
    logLevel: "info",
  });

  execFileSync("zip", ["-qr", `../${name}.zip`, "."], { cwd: outdir });
  const bytes = statSync(`dist/${name}.zip`).size;
  const mb = (bytes / 1024 / 1024).toFixed(1);
  console.log(`${name}.zip = ${mb} MB`);
  if (bytes > LIMIT_ZIPPED) {
    console.error(`FAIL: ${name}.zip exceeds Lambda's 50 MB zipped limit`);
    process.exit(1);
  }
}
console.log("\nAll worker bundles within Lambda limits.");
```

- [ ] **Step 3: Add the script**

In `package.json` scripts: `"build:workers": "node scripts/bundle-workers.mjs"`

- [ ] **Step 4: Create throwaway stubs so the bundler has entry points**

`workers/screening.ts` and `workers/application-received-email.ts`, each:

```ts
import { extractResumeText } from "@/lib/resume-extract";
import { screenResume } from "@/lib/screening";
import { applicationReceivedEmail, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

// Stub for Task 1 only. Imports the real deps so the bundle size is honest.
export const handler = async () => {
  void extractResumeText; void screenResume;
  void applicationReceivedEmail; void sendEmail; void createAdminClient;
};
```

- [ ] **Step 5: Measure**

Run: `npm run build:workers`
Expected: both sizes printed, both under 50 MB.

**If screening exceeds the limit, STOP and report.** The fallback is a Lambda layer for `pdfjs-dist` or a container image, and that changes Task 6.

- [ ] **Step 6: Gitignore build output**

Add to `.gitignore`: `dist/`

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/bundle-workers.mjs workers/ .gitignore
git commit -m "Add esbuild worker bundler with Lambda size guard"
```

---

### Task 2: Screening worker

**Files:**
- Create: `workers/screening.ts` (replaces the Task 1 stub)
- Create: `workers/config.ts`
- Reference: `lib/inngest/functions.ts` (the logic being ported; deleted in Task 7)

**Interfaces:**
- Produces: `handler(event: SQSEvent): Promise<SQSBatchResponse>`
- Produces: `workers/config.ts` exports `loadSecrets(): Promise<void>`

- [ ] **Step 1: Write the secrets loader**

`workers/config.ts`. Lambda env vars via Terraform would land in `terraform.tfstate` in plaintext, so values come from SSM Parameter Store at cold start and are cached for the container lifetime.

```ts
import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";

const PREFIX = process.env.SSM_PREFIX ?? "/talentscreen";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "NEXT_PUBLIC_SITE_URL",
] as const;

let loaded: Promise<void> | null = null;

/**
 * Fetch secrets from SSM once per container and put them on process.env, so the
 * shared lib/ modules (which read process.env directly) work unchanged in Lambda.
 * Cached at module scope: one GetParameters call per cold start, not per message.
 */
export function loadSecrets(): Promise<void> {
  loaded ??= (async () => {
    // Local dev and `npm run dev` already have a populated .env.local.
    if (process.env.QUEUE_LOCAL === "1") return;

    const ssm = new SSMClient({});
    const res = await ssm.send(
      new GetParametersCommand({
        Names: KEYS.map((k) => `${PREFIX}/${k}`),
        WithDecryption: true,
      }),
    );
    for (const p of res.Parameters ?? []) {
      const key = p.Name?.split("/").pop();
      if (key && p.Value) process.env[key] = p.Value;
    }
  })();
  return loaded;
}
```

- [ ] **Step 2: Write the worker**

`workers/screening.ts`. This is `lib/inngest/functions.ts` with `step.run()` wrappers removed and Inngest's error types replaced. The claim stays first and unchanged.

```ts
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";

import { extractResumeText } from "@/lib/resume-extract";
import { screenResume } from "@/lib/screening";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSecrets } from "./config";

/** Thrown for input that will never succeed. Marks the row ERROR, no retry. */
class PermanentError extends Error {}

/**
 * AI resume screening worker, triggered by a screening-queue message.
 *
 * SQS standard queues are at-least-once, so duplicate delivery is expected. The
 * first thing this does is an atomic PENDING|ERROR -> PROCESSING claim; a
 * redelivery claims nothing and exits. That guard is why re-running the whole
 * handler on retry is safe (there is no step memoization on SQS).
 *
 * Advisory only: never rejects a candidate. Scores and moves to SCREENED for a
 * human to decide (DECISIONS.md, human-in-the-loop).
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  await loadSecrets();
  const batchItemFailures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      const { applicationId } = JSON.parse(record.body) as {
        applicationId: string;
      };
      await screenOne(applicationId);
    } catch (err) {
      if (err instanceof PermanentError) {
        // Already marked ERROR in the DB. Delete the message; a retry cannot help.
        console.error(`[screening] permanent: ${err.message}`);
      } else {
        // Transient. Let SQS redeliver; maxReceiveCount 3 then the DLQ.
        console.error(`[screening] transient:`, err);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
  }

  return { batchItemFailures };
}

async function screenOne(applicationId: string): Promise<void> {
  const admin = createAdminClient();

  const markError = async () => {
    await admin
      .from("applications")
      .update({ screening_status: "ERROR" })
      .eq("id", applicationId);
  };

  // 1. Claim. Atomic in Postgres, so it doubles as the double-process guard.
  const { data: claimed, error: claimError } = await admin
    .from("applications")
    .update({ screening_status: "PROCESSING" })
    .eq("id", applicationId)
    .in("screening_status", ["PENDING", "ERROR"])
    .select("id");
  if (claimError) throw new Error(`Claim failed: ${claimError.message}`);
  if ((claimed?.length ?? 0) === 0) {
    console.log(`[screening] ${applicationId} already processing or done`);
    return;
  }

  // 2. Load the application and its job.
  const { data: app } = await admin
    .from("applications")
    .select("resume_path, stage, job_id")
    .eq("id", applicationId)
    .single();
  if (!app) {
    await markError();
    throw new PermanentError(`Application ${applicationId} not found.`);
  }
  if (!app.resume_path) {
    await markError();
    throw new PermanentError(`Application ${applicationId} has no resume.`);
  }

  const { data: job } = await admin
    .from("jobs")
    .select("title, description, requirements")
    .eq("id", app.job_id)
    .single();
  if (!job) {
    await markError();
    throw new PermanentError(`Job ${app.job_id} not found.`);
  }

  // 3. Extract. A scanned or empty file will not improve on retry.
  let resumeText: string;
  try {
    resumeText = await extractResumeText(app.resume_path);
  } catch (err) {
    await markError();
    throw new PermanentError(
      err instanceof Error ? err.message : "Resume extraction failed.",
    );
  }

  // 4. Screen.
  const result = await screenResume({
    jobTitle: job.title,
    jobDescription: job.description,
    requirements: job.requirements,
    resumeText,
  });

  // 5. Persist. Advance APPLIED -> SCREENED only; never pull a candidate back
  //    from a stage the employer already moved them to.
  const { error: persistError } = await admin
    .from("applications")
    .update({
      ai_score: result.score,
      ai_recommendation: result.recommendation,
      ai_summary: result.summary,
      ai_matched: result.matched,
      ai_missing: result.missing,
      ai_flags: result.flags,
      screening_status: "DONE",
      stage: app.stage === "APPLIED" ? "SCREENED" : app.stage,
    })
    .eq("id", applicationId);
  if (persistError) throw new Error(`Persist failed: ${persistError.message}`);

  console.log(
    `[screening] ${applicationId} = ${result.score} ${result.recommendation}`,
  );
}
```

- [ ] **Step 3: Add aws-lambda types**

```bash
npm i -D @types/aws-lambda
npm i @aws-sdk/client-ssm
```

- [ ] **Step 4: Typecheck and re-measure the bundle**

Run: `npm run typecheck && npm run build:workers`
Expected: clean, sizes still under 50 MB.

- [ ] **Step 5: Commit**

```bash
git add workers/ package.json package-lock.json
git commit -m "Port screening worker from Inngest to an SQS handler"
```

---

### Task 3: Email worker

**Files:**
- Create: `workers/application-received-email.ts` (replaces the Task 1 stub)
- Reference: `lib/inngest/email-functions.ts`

**Interfaces:**
- Produces: `handler(event: SQSEvent): Promise<SQSBatchResponse>`

- [ ] **Step 1: Write the worker**

Direct port of `lib/inngest/email-functions.ts`. The applicant's address lives in `auth.users`, not `profiles`, so it comes from the admin auth API.

```ts
import type { SQSBatchResponse, SQSEvent } from "aws-lambda";

import { applicationReceivedEmail, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSecrets } from "./config";

class PermanentError extends Error {}

/**
 * Applicant confirmation email, triggered by an email-queue message.
 *
 * Only the apply path enqueues here. Re-screen and a job-requirements edit write
 * to the screening queue only, which is what stops this firing again on a
 * re-screen (it used to, because both workers shared one Inngest event).
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  await loadSecrets();
  const batchItemFailures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      const { applicationId } = JSON.parse(record.body) as {
        applicationId: string;
      };
      await sendOne(applicationId);
    } catch (err) {
      if (err instanceof PermanentError) {
        console.error(`[apply-email] permanent: ${err.message}`);
      } else {
        console.error(`[apply-email] transient:`, err);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
  }

  return { batchItemFailures };
}

async function sendOne(applicationId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: app } = await admin
    .from("applications")
    .select("applicant_id, job_id")
    .eq("id", applicationId)
    .single();
  if (!app) throw new PermanentError(`Application ${applicationId} not found.`);

  const [{ data: job }, { data: userData }, { data: profile }] =
    await Promise.all([
      admin.from("jobs").select("title").eq("id", app.job_id).single(),
      admin.auth.admin.getUserById(app.applicant_id),
      admin
        .from("profiles")
        .select("full_name")
        .eq("id", app.applicant_id)
        .single(),
    ]);

  const email = userData?.user?.email;
  if (!email) throw new PermanentError("Applicant email not found.");

  const { subject, html } = applicationReceivedEmail({
    name: profile?.full_name ?? null,
    jobTitle: job?.title ?? "the role",
  });
  const sent = await sendEmail({ to: email, subject, html });
  console.log(`[apply-email] ${applicationId} to ${email} sent=${sent}`);
}
```

- [ ] **Step 2: Typecheck and bundle**

Run: `npm run typecheck && npm run build:workers`
Expected: clean, both under 50 MB.

- [ ] **Step 3: Commit**

```bash
git add workers/application-received-email.ts
git commit -m "Port application-received email worker to an SQS handler"
```

---

### Task 4: `lib/queue.ts` and the routing check

This task contains the bug fix. The check exists because routing is the one thing that must not regress.

**Files:**
- Create: `lib/queue.ts`
- Create: `scripts/check-queue-routing.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `enqueueScreening(applicationId: string): Promise<void>`
- Produces: `enqueueScreeningBatch(applicationIds: string[]): Promise<void>`
- Produces: `enqueueApplicationReceived(applicationId: string): Promise<void>`

- [ ] **Step 1: Install the SQS client**

```bash
npm i @aws-sdk/client-sqs
```

- [ ] **Step 2: Write `lib/queue.ts`**

```ts
import {
  SendMessageBatchCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

// SERVER ONLY. Publishes background work to SQS. Replaces lib/inngest/client.ts.
//
// Two queues, not one topic fanning out to both. The apply path enqueues to
// both; re-screen and a job-requirements edit enqueue to screening only. That
// split is what keeps a re-screen from re-sending the "we received your
// application" email, which is what happened when both workers shared one event.

const SCREENING_QUEUE_URL = process.env.SCREENING_QUEUE_URL;
const EMAIL_QUEUE_URL = process.env.EMAIL_QUEUE_URL;

let client: SQSClient | null = null;

function sqs(): SQSClient {
  client ??= new SQSClient({ region: process.env.AWS_REGION ?? "us-east-1" });
  return client;
}

/**
 * ponytail: local dev invokes the worker handler in-process instead of standing
 * up a queue. That skips real queue semantics (no redelivery, no DLQ, no
 * concurrency cap), which is fine for `npm run dev` and wrong for anything else.
 * Move to LocalStack only if a bug ever turns out to need real SQS behaviour.
 */
const LOCAL = process.env.QUEUE_LOCAL === "1";

function fakeEvent(applicationId: string) {
  return {
    Records: [
      {
        messageId: `local-${applicationId}`,
        body: JSON.stringify({ applicationId }),
      },
    ],
  };
}

async function send(queueUrl: string | undefined, applicationId: string) {
  if (!queueUrl) throw new Error("Queue URL not configured.");
  await sqs().send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ applicationId }),
    }),
  );
}

export async function enqueueScreening(applicationId: string): Promise<void> {
  if (LOCAL) {
    const { handler } = await import("@/workers/screening");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(fakeEvent(applicationId) as any);
    return;
  }
  await send(SCREENING_QUEUE_URL, applicationId);
}

export async function enqueueApplicationReceived(
  applicationId: string,
): Promise<void> {
  if (LOCAL) {
    const { handler } = await import("@/workers/application-received-email");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(fakeEvent(applicationId) as any);
    return;
  }
  await send(EMAIL_QUEUE_URL, applicationId);
}

/** Bulk re-screen (a job's requirements changed). SQS caps a batch at 10. */
export async function enqueueScreeningBatch(
  applicationIds: string[],
): Promise<void> {
  if (LOCAL) {
    for (const id of applicationIds) await enqueueScreening(id);
    return;
  }
  if (!SCREENING_QUEUE_URL) throw new Error("Queue URL not configured.");

  for (let i = 0; i < applicationIds.length; i += 10) {
    const chunk = applicationIds.slice(i, i + 10);
    await sqs().send(
      new SendMessageBatchCommand({
        QueueUrl: SCREENING_QUEUE_URL,
        Entries: chunk.map((applicationId, n) => ({
          Id: `${i + n}`,
          MessageBody: JSON.stringify({ applicationId }),
        })),
      }),
    );
  }
}
```

- [ ] **Step 3: Write the routing check**

`scripts/check-queue-routing.ts`. Stubs the SQS client and asserts which queue each path writes to. Matches `evals/run.ts` style: plain script, non-zero exit.

```ts
import assert from "node:assert/strict";

process.env.SCREENING_QUEUE_URL = "https://sqs.test/screening";
process.env.EMAIL_QUEUE_URL = "https://sqs.test/email";
delete process.env.QUEUE_LOCAL;

const sent: string[] = [];

const { SQSClient } = await import("@aws-sdk/client-sqs");
SQSClient.prototype.send = async function (command: {
  input: { QueueUrl?: string; Entries?: unknown[] };
}) {
  const n = command.input.Entries?.length ?? 1;
  for (let i = 0; i < n; i++) sent.push(command.input.QueueUrl!);
  return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const q = await import("../lib/queue");
const SCREENING = "https://sqs.test/screening";
const EMAIL = "https://sqs.test/email";

async function check(name: string, fn: () => Promise<void>, expected: string[]) {
  sent.length = 0;
  await fn();
  try {
    assert.deepEqual(sent, expected);
    console.log(`PASS  ${name} -> [${expected.join(", ")}]`);
    return true;
  } catch {
    console.error(`FAIL  ${name}`);
    console.error(`      expected [${expected.join(", ")}]`);
    console.error(`      actual   [${sent.join(", ")}]`);
    return false;
  }
}

const results = [
  // Apply is the ONLY path that emails. Both queues.
  await check(
    "apply",
    async () => {
      await q.enqueueScreening("app-1");
      await q.enqueueApplicationReceived("app-1");
    },
    [SCREENING, EMAIL],
  ),
  // The bug fix: neither re-enqueue path may touch the email queue.
  await check("re-screen", () => q.enqueueScreening("app-1"), [SCREENING]),
  await check(
    "requirements changed, 12 applicants",
    () => q.enqueueScreeningBatch(Array.from({ length: 12 }, (_, i) => `a-${i}`)),
    Array(12).fill(SCREENING),
  ),
];

if (results.includes(false)) {
  console.error("\nQueue routing check FAILED");
  process.exit(1);
}
console.log("\nQueue routing OK: only apply reaches the email queue.");
```

- [ ] **Step 4: Add the script**

In `package.json` scripts: `"check:queue": "node --import tsx scripts/check-queue-routing.ts"`

- [ ] **Step 5: Run it**

Run: `npm run check:queue`
Expected: three PASS lines, exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/queue.ts scripts/check-queue-routing.ts package.json package-lock.json
git commit -m "Add lib/queue.ts with SQS publishers and a routing check"
```

---

### Task 5: Swap the three call sites

**Files:**
- Modify: `app/applications/actions.ts` (apply ~line 173, re-screen ~line 225)
- Modify: `app/jobs/actions.ts` (~line 192)

- [ ] **Step 1: Apply path**

In `app/applications/actions.ts`, replace the `inngest.send` block in `applyToJob` with both enqueues. Keep the best-effort try/catch: the row and resume snapshot are already committed, so a queue outage must not fail the apply.

```ts
  // Enqueue AI screening and the confirmation email. Best-effort: the
  // application is already saved, so a transient queue error must not fail the
  // apply - the row stays PENDING and an employer can re-screen it.
  try {
    await Promise.all([
      enqueueScreening(appId),
      enqueueApplicationReceived(appId),
    ]);
  } catch (err) {
    console.error(`[apply] failed to enqueue for ${appId}:`, err);
  }
```

Update the import to `import { enqueueApplicationReceived, enqueueScreening } from "@/lib/queue";`

- [ ] **Step 2: Re-screen path**

In `rescreenApplication`, same file. Screening queue only.

```ts
  try {
    await enqueueScreening(applicationId);
  } catch {
    return { ok: false, error: "Could not queue re-screening. Please retry." };
  }
```

- [ ] **Step 3: Requirements-changed path**

In `app/jobs/actions.ts`, replace the `inngest.send(apps.map(...))` call:

```ts
      try {
        await enqueueScreeningBatch(apps.map((a) => a.id));
      } catch (err) {
        console.error(`[job ${jobId}] failed to enqueue re-screen:`, err);
      }
```

Import: `import { enqueueScreeningBatch } from "@/lib/queue";`

- [ ] **Step 4: Verify no Inngest references remain in app code**

Run: `grep -rn "inngest" app/ lib/queue.ts`
Expected: no matches.

- [ ] **Step 5: Typecheck, lint, routing check**

Run: `npm run typecheck && npm run lint && npm run check:queue`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add app/applications/actions.ts app/jobs/actions.ts
git commit -m "Route background work through SQS instead of Inngest events"
```

---

### Task 6: Terraform and deploy

**Files:**
- Create: `infra/main.tf`, `infra/iam.tf`, `infra/variables.tf`, `infra/outputs.tf`, `infra/.gitignore`

Resources: 2 queues, 2 DLQs, 6 SSM SecureString parameters, 2 execution roles, 2 Lambdas, 2 event source mappings, 2 CloudWatch log groups with retention, 2 DLQ alarms, 1 publisher IAM user.

- [ ] **Step 1: Gitignore state and secrets first**

`infra/.gitignore`:

```text
.terraform/
*.tfstate
*.tfstate.*
*.tfvars
tfplan
```

Do this before `terraform init`, so state and secrets can never be committed.

- [ ] **Step 2: Write `infra/variables.tf`**

```hcl
variable "region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "talentscreen"
}

variable "secrets" {
  description = "Worker secrets, stored in SSM. Supplied via a gitignored terraform.tfvars."
  type        = map(string)
  sensitive   = true
}
```

- [ ] **Step 3: Write `infra/main.tf`**

Queue visibility timeout is 6x the function timeout, per AWS guidance, so a
message is not redelivered while still being processed.

```hcl
terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region
}

locals {
  workers = {
    screening = {
      timeout            = 120
      memory             = 1024
      visibility_timeout = 720
      batch_size         = 1
    }
    "application-received-email" = {
      timeout            = 30
      memory             = 256
      visibility_timeout = 180
      batch_size         = 10
    }
  }
}

# ---------- queues ----------

resource "aws_sqs_queue" "dlq" {
  for_each                  = local.workers
  name                      = "${var.project}-${each.key}-dlq"
  message_retention_seconds = 1209600 # 14 days, the maximum
}

resource "aws_sqs_queue" "main" {
  for_each                   = local.workers
  name                       = "${var.project}-${each.key}"
  visibility_timeout_seconds = each.value.visibility_timeout

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = 3
  })
}

# ---------- secrets ----------

resource "aws_ssm_parameter" "secret" {
  for_each = var.secrets
  name     = "/${var.project}/${each.key}"
  type     = "SecureString"
  value    = each.value
}

# ---------- functions ----------

resource "aws_cloudwatch_log_group" "worker" {
  for_each          = local.workers
  name              = "/aws/lambda/${var.project}-${each.key}"
  retention_in_days = 14 # unbounded logs eventually cost money
}

resource "aws_lambda_function" "worker" {
  for_each = local.workers

  function_name    = "${var.project}-${each.key}"
  role             = aws_iam_role.worker[each.key].arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  # The zip is produced by `npm run build:workers`, which also enforces the
  # 50 MB limit. Terraform consumes it rather than re-zipping.
  filename         = "${path.module}/../dist/${each.key}.zip"
  source_code_hash = filebase64sha256("${path.module}/../dist/${each.key}.zip")
  timeout          = each.value.timeout
  memory_size      = each.value.memory

  # Bounds Anthropic rate limits and Supabase connections. Matches the
  # concurrency limit the Inngest function used.
  reserved_concurrent_executions = 5

  environment {
    variables = {
      SSM_PREFIX = "/${var.project}"
    }
  }

  depends_on = [aws_cloudwatch_log_group.worker]
}

resource "aws_lambda_event_source_mapping" "worker" {
  for_each = local.workers

  event_source_arn = aws_sqs_queue.main[each.key].arn
  function_name    = aws_lambda_function.worker[each.key].arn
  batch_size       = each.value.batch_size

  # Without this, one bad message redelivers the whole batch.
  function_response_types = ["ReportBatchItemFailures"]
}

# ---------- DLQ alarms (free, and the only observability worth having) ----------

resource "aws_cloudwatch_metric_alarm" "dlq_not_empty" {
  for_each = local.workers

  alarm_name          = "${var.project}-${each.key}-dlq-not-empty"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = { QueueName = aws_sqs_queue.dlq[each.key].name }
}
```

- [ ] **Step 4: Write `infra/iam.tf`**

```hcl
data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "worker" {
  for_each           = local.workers
  name               = "${var.project}-${each.key}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# Least privilege: each worker reads only its own queue, and only this
# project's SSM parameters.
data "aws_iam_policy_document" "worker" {
  for_each = local.workers

  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ChangeMessageVisibility",
    ]
    resources = [aws_sqs_queue.main[each.key].arn]
  }

  statement {
    actions   = ["ssm:GetParameters"]
    resources = ["arn:aws:ssm:${var.region}:*:parameter/${var.project}/*"]
  }

  statement {
    actions   = ["kms:Decrypt"]
    resources = ["*"] # the account's default SSM key
  }

  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.worker[each.key].arn}:*"]
  }
}

resource "aws_iam_role_policy" "worker" {
  for_each = local.workers
  role     = aws_iam_role.worker[each.key].id
  policy   = data.aws_iam_policy_document.worker[each.key].json
}

# ---------- publisher for Vercel ----------
# An IAM user with a long-lived key, because Vercel Hobby has no OIDC
# federation. Scoped to SendMessage on exactly these two queues, nothing else.
# Upgrade path recorded in DECISIONS.md.

resource "aws_iam_user" "publisher" {
  name = "${var.project}-vercel-publisher"
}

data "aws_iam_policy_document" "publisher" {
  statement {
    actions   = ["sqs:SendMessage", "sqs:SendMessageBatch"]
    resources = [for q in aws_sqs_queue.main : q.arn]
  }
}

resource "aws_iam_user_policy" "publisher" {
  user   = aws_iam_user.publisher.name
  policy = data.aws_iam_policy_document.publisher.json
}

resource "aws_iam_access_key" "publisher" {
  user = aws_iam_user.publisher.name
}
```

- [ ] **Step 5: Write `infra/outputs.tf`**

```hcl
output "screening_queue_url" {
  value = aws_sqs_queue.main["screening"].url
}

output "email_queue_url" {
  value = aws_sqs_queue.main["application-received-email"].url
}

output "publisher_access_key_id" {
  value = aws_iam_access_key.publisher.id
}

output "publisher_secret_access_key" {
  value     = aws_iam_access_key.publisher.secret
  sensitive = true
}
```

- [ ] **Step 6: Create `infra/terraform.tfvars` (gitignored) and apply**

```hcl
secrets = {
  NEXT_PUBLIC_SUPABASE_URL  = "..."
  SUPABASE_SERVICE_ROLE_KEY = "..."
  ANTHROPIC_API_KEY         = "..."
  RESEND_API_KEY            = "..."
  RESEND_FROM               = "TalentScreen <...>"
  NEXT_PUBLIC_SITE_URL      = "https://talent-screen.vercel.app"
}
```

```bash
npm run build:workers
cd infra && terraform init && terraform plan
```

Review the plan, then `terraform apply`.

- [ ] **Step 7: Set the Vercel env vars**

From the outputs: `SCREENING_QUEUE_URL`, `EMAIL_QUEUE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=us-east-1`.

Read the secret with `terraform output -raw publisher_secret_access_key`.

- [ ] **Step 8: Verify end to end**

1. Apply to a job on the deployed site. Row goes `PENDING -> PROCESSING -> DONE`, score persists, one confirmation email arrives.
2. Click re-screen. It re-scores, and **no second confirmation email arrives.** This is the bug fix.
3. Send a garbage message and confirm it reaches the DLQ after 3 attempts:

```bash
aws sqs send-message --queue-url "$(terraform output -raw screening_queue_url)" \
  --message-body '{"applicationId":"00000000-0000-0000-0000-000000000000"}'
```

- [ ] **Step 9: Commit**

```bash
git add infra/
git commit -m "Add Terraform for SQS queues, DLQs, Lambda workers, and IAM"
```

---

### Task 7: Delete Inngest and update docs

Do this only after Task 6 is verified working in production.

**Files:**
- Delete: `lib/inngest/client.ts`, `lib/inngest/functions.ts`, `lib/inngest/email-functions.ts`, `app/api/inngest/route.ts`
- Modify: `package.json`, `.env.example`, `README.md`, `docs/ARCHITECTURE.md`, `DECISIONS.md`

- [ ] **Step 1: Delete the files and the dependency**

```bash
rm -rf lib/inngest app/api/inngest
npm uninstall inngest
```

- [ ] **Step 2: Fix the stale comments in shared libs**

`lib/resume-extract.ts:8` says "both run in the Inngest worker on the Node runtime". `lib/screening.ts:3` says "Runs in the Inngest worker." Update both to say the Lambda worker.

- [ ] **Step 3: Update `.env.example`**

Remove `INNGEST_DEV`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`. Add `SCREENING_QUEUE_URL`, `EMAIL_QUEUE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `QUEUE_LOCAL`.

- [ ] **Step 4: Update `README.md`**

The env var table, the tech-stack table (Inngest row becomes SQS + Lambda), and the local dev steps: drop the `npx inngest-cli dev` terminal, note `QUEUE_LOCAL=1` instead.

- [ ] **Step 5: Update `docs/ARCHITECTURE.md`**

It has ~15 Inngest references including a mermaid diagram and a "Why Inngest" section. Redraw the diagram with two queues and two Lambdas, and rewrite that section as "Why our own queues."

- [ ] **Step 6: Append to `DECISIONS.md`**

New Phase 7 section recording: the SQS + Lambda move and why; two queues over SNS fan-out and the duplicate-email bug it fixed; SSM Parameter Store over Lambda env vars; the IAM user over OIDC and its upgrade path; `QUEUE_LOCAL` over LocalStack; manual DLQ redrive; and the loss of step memoization as an accepted trade.

- [ ] **Step 7: Full verification**

Run: `npm run typecheck && npm run lint && npm run check:queue && npm run build && npm run build:workers`
Expected: all clean.

Run: `grep -rni inngest app lib scripts workers infra package.json .env.example README.md docs`
Expected: no matches outside `DECISIONS.md` (which keeps the history deliberately).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Remove Inngest and document the SQS + Lambda architecture"
```
