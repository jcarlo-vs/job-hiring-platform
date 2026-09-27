# infra

Terraform for the AWS half of the background pipeline. Owns **only** AWS:
two SQS queues, two dead-letter queues, two Lambda workers, their IAM roles,
the SSM parameters holding their secrets, and a publish-only IAM user for
Vercel. Neon and Vercel are managed outside Terraform.

Design notes live in `docs/superpowers/specs/2026-09-26-aws-queue-workers-design.md`.

## First deploy

**1. Build the worker zips.** Terraform reads `dist/*.zip` directly, so
`plan` fails if they are missing.

```bash
cd ..
npm run build:workers   # also fails if a bundle exceeds Lambda's 50 MB limit
cd infra
```

**2. Create `terraform.tfvars`.** It is gitignored. Copy the values from your
`.env.local`.

```hcl
secrets = {
  # Neon OWNER connection. The workers bypass RLS by design, which is why this
  # is the one required secret.
  DATABASE_URL      = "postgresql://...neon.tech/neondb?sslmode=verify-full"
  ANTHROPIC_API_KEY = "sk-ant-..."
  RESEND_API_KEY    = "re_..."
}
```

Only `DATABASE_URL` is required. The workers degrade gracefully without the
rest: screening surfaces an `ERROR` with no Anthropic key, and email no-ops
with no Resend key.

Non-secrets (the S3 bucket name, the Cognito pool id, the site URL) are plain
Lambda environment variables set by Terraform, not stored here.

**3. Apply.**

```bash
terraform init
terraform plan     # read it before applying
terraform apply
```

**4. Put the outputs into Vercel** as environment variables:

```bash
terraform output SCREENING_QUEUE_URL
terraform output EMAIL_QUEUE_URL
terraform output AWS_ACCESS_KEY_ID
terraform output -raw AWS_SECRET_ACCESS_KEY
```

Plus `AWS_REGION=us-east-1`. Redeploy Vercel so they take effect.

## Redeploying a worker after a code change

```bash
cd .. && npm run build:workers && cd infra && terraform apply
```

`source_code_hash` picks up the new zip, so only the changed function is
replaced.

## Cost

$0/month. Lambda (1M requests + 400k GB-seconds) and SQS (1M requests) are
both on the **Always Free** tier, not a 12-month one, which matters because
this account is on the post-July-2025 credit model. SSM Parameter Store
standard tier and CloudWatch alarms are free. Log retention is capped at 14
days so log storage stays inside the free 5 GB.

## If something lands in a DLQ

The `*-dlq-not-empty` CloudWatch alarms fire on anything arriving. There is no
DLQ consumer by design: at this volume nothing should ever get there, so
redrive is manual.

```bash
terraform output dlq_urls
# inspect, fix the cause, then redrive from the SQS console
```

## State

State is local and gitignored. It contains the publisher's secret access key in
plaintext, so it must never be committed. Moving to an S3 backend with
DynamoDB locking is the obvious next step and is deliberately not done yet:
there is one operator and one workstation.

## Why every apply shows a Lambda update

`zip` embeds file timestamps, so `npm run build:workers` produces a different
`source_code_hash` even when the JavaScript is byte-identical. Terraform
therefore plans an in-place code update on every apply after a rebuild. It is
free and harmless; not worth chasing reproducible zips for.

## Cognito

`cognito.tf` creates the user pool that replaces Supabase Auth. The app verifies
ID tokens against its JWKS and uses `sub` as `profiles.id`.

There is deliberately **no pre-token-generation trigger**. One existed while the
plan was to have Supabase trust Cognito as a third-party auth provider, because
Supabase reads a `role` claim to choose a Postgres role. Going straight to Neon
made it dead weight: we set the RLS context ourselves and nothing reads a custom
claim.

## S3

`s3.tf` creates the private resumes bucket. Uploads are browser-to-S3 via a
presigned **POST**, not PUT: a PUT cannot enforce a size limit, and the POST
policy keeps the `content-length-range` and `Content-Type` guarantees the
original Supabase bucket config provided.
