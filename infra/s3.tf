# ---------------------------------------------------------------------------
# S3: resume storage. Replaces the private Supabase Storage bucket.
#
# Path convention carries over unchanged from Supabase, so profiles.resume_path
# and applications.resume_path need no migration:
#   profile default : profiles/{userId}.{ext}
#   per application : {jobId}/{applicationId}.{ext}
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "resumes" {
  bucket = "${var.project}-resumes-${data.aws_caller_identity.current.account_id}"
}

# Private, always. Every read goes through the app, which authorizes first.
resource "aws_s3_bucket_public_access_block" "resumes" {
  bucket                  = aws_s3_bucket.resumes.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "resumes" {
  bucket = aws_s3_bucket.resumes.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Uploads are browser -> S3 directly via a presigned POST, so the browser's
# origin must be allowed to PUT/POST here.
resource "aws_s3_bucket_cors_configuration" "resumes" {
  bucket = aws_s3_bucket.resumes.id

  cors_rule {
    allowed_methods = ["POST", "PUT", "GET"]
    allowed_origins = var.allowed_upload_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# A presigned POST that is never completed leaves nothing behind, but a
# multipart upload that is abandoned does. Clean those up rather than paying
# for them forever.
resource "aws_s3_bucket_lifecycle_configuration" "resumes" {
  bucket = aws_s3_bucket.resumes.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------

# The screening worker reads the snapshotted resume. Read only: it has no
# reason to write, and this is the one place the whole S3 story could go wrong
# quietly.
data "aws_iam_policy_document" "screening_s3" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.resumes.arn}/*"]
  }
}

resource "aws_iam_role_policy" "screening_s3" {
  name   = "${var.project}-screening-s3"
  role   = aws_iam_role.worker["screening"].id
  policy = data.aws_iam_policy_document.screening_s3.json
}

# The Vercel app mints presigned upload URLs, snapshots the profile resume onto
# the application path on apply, and streams the file back for the inline
# viewer. Scoped to this bucket's objects only.
data "aws_iam_policy_document" "app_s3" {
  statement {
    sid = "ResumeObjects"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.resumes.arn}/*"]
  }

  statement {
    sid       = "BucketLocation"
    actions   = ["s3:GetBucketLocation"]
    resources = [aws_s3_bucket.resumes.arn]
  }
}

resource "aws_iam_user_policy" "app_s3" {
  name   = "${var.project}-app-s3"
  user   = aws_iam_user.publisher.name
  policy = data.aws_iam_policy_document.app_s3.json
}
