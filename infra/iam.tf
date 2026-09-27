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
  for_each = local.workers

  name               = "${var.project}-${each.key}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# Least privilege, per worker: each one can drain only its own queue. Notably
# there is no sqs:SendMessage here, so a worker cannot enqueue to the other
# queue even if a future bug tried to.
data "aws_iam_policy_document" "worker" {
  for_each = local.workers

  statement {
    sid = "ConsumeOwnQueue"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ChangeMessageVisibility",
    ]
    resources = [aws_sqs_queue.main[each.key].arn]
  }

  statement {
    sid       = "ReadOwnSecrets"
    actions   = ["ssm:GetParameters"]
    resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/*"]
  }

  # SecureStrings use the AWS-managed alias/aws/ssm key, whose ARN cannot be
  # referenced directly, so this is scoped by the service that may use it rather
  # than by key.
  statement {
    sid       = "DecryptSecureStringsViaSSM"
    actions   = ["kms:Decrypt"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.region}.amazonaws.com"]
    }
  }

  statement {
    sid = "WriteOwnLogs"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.worker[each.key].arn}:*"]
  }
}

resource "aws_iam_role_policy" "worker" {
  for_each = local.workers

  name   = "${var.project}-${each.key}-policy"
  role   = aws_iam_role.worker[each.key].id
  policy = data.aws_iam_policy_document.worker[each.key].json
}

data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# Publisher for Vercel
#
# An IAM user with a long-lived access key, because Vercel Hobby has no OIDC
# federation. Scoped to SendMessage on exactly these two queues and nothing
# else, so a leaked key can enqueue background jobs and cannot read the queues,
# the secrets, or anything in the account.
#
# Upgrade path if this ever moves to a Vercel plan with OIDC: replace this user
# with an aws_iam_role trusting Vercel's OIDC provider and drop the key.
# ---------------------------------------------------------------------------

resource "aws_iam_user" "publisher" {
  name = "${var.project}-vercel-publisher"
}

data "aws_iam_policy_document" "publisher" {
  statement {
    sid       = "EnqueueOnly"
    actions   = ["sqs:SendMessage", "sqs:SendMessageBatch"]
    resources = [for q in aws_sqs_queue.main : q.arn]
  }
}

resource "aws_iam_user_policy" "publisher" {
  name   = "${var.project}-publish-only"
  user   = aws_iam_user.publisher.name
  policy = data.aws_iam_policy_document.publisher.json
}

resource "aws_iam_access_key" "publisher" {
  user = aws_iam_user.publisher.name
}
