variable "region" {
  description = <<-EOT
    AWS region.

    ap-southeast-1 (Singapore) to sit beside Neon, which is ap-southeast-1, and
    beside Vercel's functions, which vercel.json pins to sin1. Everything that
    talks to everything else is now in one place; the screening worker's
    round trips to Neon were otherwise crossing the Pacific twice.
  EOT
  type        = string
  default     = "ap-southeast-1"
}

variable "project" {
  description = "Name prefix for every resource, and the SSM parameter path."
  type        = string
  default     = "talentscreen"
}

variable "secrets" {
  description = <<-EOT
    Worker secrets, written to SSM Parameter Store as SecureStrings.

    Supplied from a gitignored terraform.tfvars. Required keys:
      DATABASE_URL   (Neon, owner role - the workers bypass RLS by design)
    Optional (the workers degrade gracefully without them):
      ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_FROM

    Non-secrets (bucket name, Cognito pool id, site URL) are plain Lambda
    environment variables, not stored here.
  EOT
  type        = map(string)
  sensitive   = true

  validation {
    condition = alltrue([
      for k in ["DATABASE_URL"] :
      contains(keys(var.secrets), k)
    ])
    error_message = "secrets must include DATABASE_URL."
  }
}

variable "allowed_upload_origins" {
  description = "Origins allowed to upload directly to the resumes bucket."
  type        = list(string)
  default = [
    "https://talent-screen.vercel.app",
    "http://localhost:3000",
  ]
}

variable "site_url" {
  description = "Public base URL, used for links in transactional email."
  type        = string
  default     = "https://talent-screen.vercel.app"
}

variable "cognito_domain_prefix" {
  description = <<-EOT
    Prefix for the Cognito hosted UI domain, which becomes
    https://<prefix>.auth.<region>.amazoncognito.com

    Must be globally unique across all AWS accounts. If apply fails with
    "domain already exists", pick another prefix.
  EOT
  type        = string
  default     = "talentscreen-auth"
}

variable "oauth_callback_urls" {
  description = "Where Cognito may send a user back after a hosted-UI sign-in."
  type        = list(string)
  default = [
    "https://talent-screen.vercel.app/auth/callback",
    "http://localhost:3000/auth/callback",
  ]
}

variable "oauth_logout_urls" {
  description = "Where Cognito may send a user after hosted-UI sign-out."
  type        = list(string)
  default = [
    "https://talent-screen.vercel.app/",
    "http://localhost:3000/",
  ]
}

variable "google_client_id" {
  description = <<-EOT
    Google OAuth client ID. Leave empty to skip Google sign-in entirely: the
    provider resource is then not created and the pool stays COGNITO-only, so
    this applies cleanly before the credentials exist.
  EOT
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth client secret. Supplied via terraform.tfvars."
  type        = string
  default     = ""
  sensitive   = true
}
