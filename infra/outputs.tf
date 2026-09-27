# These six values go into Vercel's environment variables. See infra/README.md.

output "SCREENING_QUEUE_URL" {
  description = "Vercel env var."
  value       = aws_sqs_queue.main["screening"].url
}

output "EMAIL_QUEUE_URL" {
  description = "Vercel env var."
  value       = aws_sqs_queue.main["application-received-email"].url
}

output "AWS_ACCESS_KEY_ID" {
  description = "Vercel env var. Publisher user, SendMessage on the two queues only."
  value       = aws_iam_access_key.publisher.id
}

output "AWS_SECRET_ACCESS_KEY" {
  description = "Vercel env var. Read with: terraform output -raw AWS_SECRET_ACCESS_KEY"
  value       = aws_iam_access_key.publisher.secret
  sensitive   = true
}

output "dlq_urls" {
  description = "For manual redrive if a message ever exhausts its retries."
  value       = { for k, q in aws_sqs_queue.dlq : k => q.url }
}
