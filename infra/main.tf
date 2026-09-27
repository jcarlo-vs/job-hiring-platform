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

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}

# Both workers are the same shape (SQS queue -> DLQ -> Lambda), so they are one
# map rather than two near-identical copies of every resource. Screening gets
# more memory and a longer timeout because it parses a PDF and calls a model;
# the email worker just formats HTML and posts to Resend.
locals {
  workers = {
    screening = {
      timeout            = 120
      memory             = 1024
      visibility_timeout = 720 # 6x the function timeout, per AWS guidance
      batch_size         = 1   # one long AI call per message
    }
    "application-received-email" = {
      timeout            = 30
      memory             = 256
      visibility_timeout = 180
      batch_size         = 10
    }
  }
}

# ---------------------------------------------------------------------------
# Queues
# ---------------------------------------------------------------------------

resource "aws_sqs_queue" "dlq" {
  for_each = local.workers

  name = "${var.project}-${each.key}-dlq"

  # 14 days, the maximum, so a failure is still inspectable after a weekend.
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "main" {
  for_each = local.workers

  name = "${var.project}-${each.key}"

  # Must exceed the function timeout, or SQS redelivers a message that is still
  # being processed and the work runs twice.
  visibility_timeout_seconds = each.value.visibility_timeout
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = 3
  })
}

# ---------------------------------------------------------------------------
# Secrets
#
# SSM Parameter Store standard tier is free. Lambda environment variables would
# be simpler but Terraform writes them into terraform.tfstate in plaintext, and
# one of these is the Supabase service-role key that bypasses RLS.
# ---------------------------------------------------------------------------

resource "aws_ssm_parameter" "secret" {
  # Iterating var.secrets directly is rejected: for_each keys become resource
  # instance names, so they may not derive from a sensitive value. The key names
  # (ANTHROPIC_API_KEY and friends) are not secret, only the values are.
  for_each = nonsensitive(toset(keys(var.secrets)))

  name  = "/${var.project}/${each.key}"
  type  = "SecureString"
  value = var.secrets[each.key]

  lifecycle {
    # Rotating a key by hand in the console should not be clobbered on next apply.
    ignore_changes = [value]
  }
}

# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------

# Created explicitly so retention is bounded. Lambda would otherwise create
# these implicitly with "never expire", and unbounded logs eventually cost money.
resource "aws_cloudwatch_log_group" "worker" {
  for_each = local.workers

  name              = "/aws/lambda/${var.project}-${each.key}"
  retention_in_days = 14
}

resource "aws_lambda_function" "worker" {
  for_each = local.workers

  function_name = "${var.project}-${each.key}"
  role          = aws_iam_role.worker[each.key].arn
  runtime       = "nodejs22.x"
  handler       = "index.handler"

  # Produced by `npm run build:workers`, which also enforces the 50 MB limit.
  # Terraform consumes that zip rather than re-zipping, so there is one artifact.
  filename         = "${path.module}/../dist/${each.key}.zip"
  source_code_hash = filebase64sha256("${path.module}/../dist/${each.key}.zip")

  timeout     = each.value.timeout
  memory_size = each.value.memory

  # Bounds Anthropic rate limits and Supabase connections. Matches the
  # concurrency: { limit: 5 } the Inngest function used.
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

  # Without this, one poison message redelivers the whole batch and the good
  # messages in it get processed repeatedly.
  function_response_types = ["ReportBatchItemFailures"]
}

# ---------------------------------------------------------------------------
# Observability
#
# One alarm per DLQ. At zero traffic nothing should ever land there, so anything
# arriving is worth knowing about. A DLQ consumer Lambda would be speculative;
# redrive is manual until something actually fails.
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "dlq_not_empty" {
  for_each = local.workers

  alarm_name          = "${var.project}-${each.key}-dlq-not-empty"
  alarm_description   = "A ${each.key} message exhausted its retries."
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.dlq[each.key].name
  }
}
