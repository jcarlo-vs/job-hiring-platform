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

# ---------------------------------------------------------------------------
# Cognito. All four go into Vercel as environment variables.
# ---------------------------------------------------------------------------

output "COGNITO_USER_POOL_ID" {
  description = "Vercel env var."
  value       = aws_cognito_user_pool.main.id
}

output "COGNITO_CLIENT_ID" {
  description = "Vercel env var."
  value       = aws_cognito_user_pool_client.web.id
}

output "COGNITO_CLIENT_SECRET" {
  description = "Vercel env var. Read with: terraform output -raw COGNITO_CLIENT_SECRET"
  value       = aws_cognito_user_pool_client.web.client_secret
  sensitive   = true
}

output "cognito_issuer_url" {
  description = "OIDC issuer. Useful when verifying tokens outside this app."
  value       = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "RESUME_BUCKET" {
  description = "Vercel env var. Private S3 bucket holding resumes."
  value       = aws_s3_bucket.resumes.id
}

output "cognito_hosted_domain" {
  description = "Cognito hosted UI base URL."
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.region}.amazoncognito.com"
}

output "GOOGLE_REDIRECT_URI" {
  description = <<-EOT
    Paste this into the Google Cloud OAuth client as an Authorized redirect URI.
    It points at Cognito, NOT at the app - Google redirects here, Cognito
    exchanges the code, then Cognito redirects to /auth/callback.
  EOT
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.region}.amazoncognito.com/oauth2/idpresponse"
}
