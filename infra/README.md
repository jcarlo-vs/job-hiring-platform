# infra

Terraform for the AWS half of the background pipeline. Owns **only** AWS:
two SQS queues, two dead-letter queues, two Lambda workers, their IAM roles,
the SSM parameters holding their secrets, and a publish-only IAM user for
Vercel. Supabase and Vercel are managed outside Terraform.

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
  NEXT_PUBLIC_SUPABASE_URL  = "https://xxxx.supabase.co"
  SUPABASE_SERVICE_ROLE_KEY = "eyJ..."
  ANTHROPIC_API_KEY         = "sk-ant-..."
  RESEND_API_KEY            = "re_..."
  RESEND_FROM               = "TalentScreen <you@yourdomain.com>"
  NEXT_PUBLIC_SITE_URL      = "https://talent-screen.vercel.app"
}
```

Only the first two are required. The workers degrade gracefully without the
rest: screening surfaces an `ERROR` with no Anthropic key, and email no-ops
with no Resend key.

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
