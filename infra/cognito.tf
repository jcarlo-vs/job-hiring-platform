# ---------------------------------------------------------------------------
# Cognito: authentication. Replaces Supabase Auth.
#
# The app verifies the ID token against this pool's JWKS and uses its `sub` as
# profiles.id. There is no pre-token-generation trigger: that was only needed
# when Supabase was going to read a `role` claim to pick a Postgres role, and
# Supabase is gone. Nothing reads a custom claim now.
# ---------------------------------------------------------------------------

resource "aws_cognito_user_pool" "main" {
  name = "${var.project}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  deletion_protection      = "ACTIVE"

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # The app reads role and full_name from the profiles table, not from Cognito.
  # Only email lives here, so there are no custom attributes to declare.
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 3
      max_length = 255
    }
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

# Server-side only, so a client secret is appropriate: the app never runs an auth
# flow in the browser. ADMIN_USER_PASSWORD_AUTH lets the signup/login server
# actions authenticate directly; REFRESH_TOKEN_AUTH backs the silent refresh in
# proxy.ts.
resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project}-web"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = true

  explicit_auth_flows = [
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # Hosted-UI OAuth, for social sign-in. The email + password flow above does
  # not use any of this; it stays a direct server-side call.
  #
  # "Google" is only listed once the provider actually exists; naming a
  # provider that has not been created fails the apply.
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers = concat(
    ["COGNITO"],
    var.google_client_id == "" ? [] : ["Google"],
  )
  callback_urls = var.oauth_callback_urls
  logout_urls   = var.oauth_logout_urls

  # Matches the cookie lifetimes in lib/cognito.ts: 1 hour access, 30 day refresh.
  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Without this a wrong password returns UserNotFoundException, which tells an
  # attacker the address is not registered.
  prevent_user_existence_errors = "ENABLED"

  # supported_identity_providers is computed from a variable, not from the
  # provider resource, so Terraform sees no edge between them and will happily
  # update this client BEFORE the Google provider exists. Cognito then accepts
  # the update and silently drops the unknown provider name, leaving the client
  # on ["COGNITO"] with no error anywhere. Found exactly that way.
  depends_on = [aws_cognito_identity_provider.google]
}

# ---------------------------------------------------------------------------
# The email worker looks up an applicant's address. It lives with the identity
# provider, not in the profiles table, which is why this permission exists.
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "email_worker_cognito" {
  statement {
    actions   = ["cognito-idp:AdminGetUser"]
    resources = [aws_cognito_user_pool.main.arn]
  }
}

resource "aws_iam_role_policy" "email_worker_cognito" {
  name   = "${var.project}-email-worker-cognito"
  role   = aws_iam_role.worker["application-received-email"].id
  policy = data.aws_iam_policy_document.email_worker_cognito.json
}

# ---------------------------------------------------------------------------
# The Vercel app runs every auth flow server side, so its IAM user needs the
# Admin* Cognito actions.
#
# Worth knowing: `npm run check:auth` passes on a developer machine without
# these, because it picks up an admin AWS profile from the default credential
# chain. Production uses this scoped user instead, so a missing permission here
# shows up only as "Invalid email or password" on the live site. Scoped to this
# one pool.
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "app_cognito" {
  statement {
    sid = "AuthFlows"
    actions = [
      "cognito-idp:AdminInitiateAuth",    # sign in, and refresh
      "cognito-idp:AdminCreateUser",      # sign up
      "cognito-idp:AdminSetUserPassword", # sign up, permanent password
      "cognito-idp:AdminGetUser",         # resolve an applicant's address
    ]
    resources = [aws_cognito_user_pool.main.arn]
  }
}

resource "aws_iam_user_policy" "app_cognito" {
  name   = "${var.project}-app-cognito"
  user   = aws_iam_user.publisher.name
  policy = data.aws_iam_policy_document.app_cognito.json
}

# ---------------------------------------------------------------------------
# Hosted UI domain.
#
# Needed for any social sign-in. The OAuth redirect does not go from Google
# straight back to the app: it goes to THIS domain, Cognito exchanges it, and
# only then does Cognito redirect to our /auth/callback. That is why the
# redirect URI registered with Google points here and not at talent-screen.
#
# A Cognito-prefix domain is free; a custom domain would need an ACM
# certificate in us-east-1.
# ---------------------------------------------------------------------------

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

# ---------------------------------------------------------------------------
# Google as a social identity provider.
#
# Created only when credentials are supplied, so the rest of the stack applies
# cleanly before you have them.
#
# The attribute mapping matters: Cognito needs `email` to populate the user,
# and `email_verified` so a Google account is not treated as unverified and
# forced through a confirmation it can never complete.
# ---------------------------------------------------------------------------

resource "aws_cognito_identity_provider" "google" {
  count = var.google_client_id == "" ? 0 : 1

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
    name           = "name"
    username       = "sub"
  }
}
