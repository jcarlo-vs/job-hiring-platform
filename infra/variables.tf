variable "region" {
  description = "AWS region. Keep it close to the Supabase project and Vercel region."
  type        = string
  default     = "us-east-1"
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
      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    Optional (the workers degrade gracefully without them):
      ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_FROM, NEXT_PUBLIC_SITE_URL
  EOT
  type        = map(string)
  sensitive   = true

  validation {
    condition = alltrue([
      for k in ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] :
      contains(keys(var.secrets), k)
    ])
    error_message = "secrets must include NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  }
}
