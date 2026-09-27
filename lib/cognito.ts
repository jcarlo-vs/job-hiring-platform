import { createHmac } from "node:crypto";

import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  type AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider";

import { awsCredentials } from "@/lib/aws-credentials";

/**
 * SERVER ONLY. Cognito user pool operations. Replaces Supabase Auth.
 *
 * Everything here runs server side, which is why the app client is configured
 * with a secret and uses the ADMIN_* auth flows: the browser never talks to
 * Cognito directly and never holds a token in JavaScript. Tokens live in
 * httpOnly cookies (see lib/session.ts).
 */

const REGION = process.env.COGNITO_REGION ?? process.env.SQS_REGION ?? "us-east-1";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;

let client: CognitoIdentityProviderClient | null = null;

function idp(): CognitoIdentityProviderClient {
  client ??= new CognitoIdentityProviderClient({
    region: REGION,
    credentials: awsCredentials(),
  });
  return client;
}

function requireConfig() {
  if (!USER_POOL_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID and COGNITO_CLIENT_SECRET must be set.",
    );
  }
  return { USER_POOL_ID, CLIENT_ID, CLIENT_SECRET };
}

/**
 * Cognito requires this on every call when the app client has a secret. It is
 * HMAC-SHA256 of (username + clientId) keyed by the client secret. Getting it
 * wrong produces "Unable to verify secret hash for client", which is not an
 * obvious message.
 */
function secretHash(username: string): string {
  const { CLIENT_ID, CLIENT_SECRET } = requireConfig();
  return createHmac("sha256", CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest("base64");
}

export type Tokens = {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
};

function toTokens(r: AuthenticationResultType | undefined): Tokens {
  if (!r?.IdToken || !r.AccessToken) {
    throw new Error("Cognito did not return tokens.");
  }
  return {
    idToken: r.IdToken,
    accessToken: r.AccessToken,
    refreshToken: r.RefreshToken,
    expiresIn: r.ExpiresIn ?? 3600,
  };
}

/** Sign in with email + password. Throws on bad credentials. */
export async function signIn(
  email: string,
  password: string,
): Promise<Tokens> {
  const { USER_POOL_ID, CLIENT_ID } = requireConfig();
  const res = await idp().send(
    new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash(email),
      },
    }),
  );
  return toTokens(res.AuthenticationResult);
}

/**
 * Exchange a refresh token for a fresh id/access token.
 *
 * Note the SECRET_HASH here is keyed on the user's `sub`, not their email.
 * Cognito validates it against the username it has on file for the refresh
 * token, which for a pool with email as the username alias is the sub.
 */
export async function refresh(
  refreshToken: string,
  sub: string,
): Promise<Tokens> {
  const { USER_POOL_ID, CLIENT_ID } = requireConfig();
  const res = await idp().send(
    new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        SECRET_HASH: secretHash(sub),
      },
    }),
  );
  // A refresh response has no new refresh token; the old one stays valid.
  return { ...toTokens(res.AuthenticationResult), refreshToken };
}

/**
 * Create a confirmed user with a permanent password, then sign them in.
 *
 * AdminCreateUser + AdminSetUserPassword(Permanent) is used instead of SignUp
 * so there is no emailed confirmation code in the loop. The old Supabase setup
 * had email confirmation disabled for the same reason (DECISIONS.md, Phase 1):
 * the built-in mailer was rate limited and made the demo impractical.
 */
export async function signUp(
  email: string,
  password: string,
): Promise<Tokens> {
  const { USER_POOL_ID } = requireConfig();

  await idp().send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      MessageAction: "SUPPRESS",
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
      ],
    }),
  );

  await idp().send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true,
    }),
  );

  return signIn(email, password);
}

/**
 * Look up a user's email address by their `sub`.
 *
 * Replaces Supabase's auth.admin.getUserById, which the confirmation-email
 * worker used because the address lives with the identity provider, not in the
 * profiles table.
 */
export async function getEmailBySub(sub: string): Promise<string | null> {
  // Only the pool id is needed here, not the app client, so this works in the
  // Lambda workers which never run an auth flow.
  if (!USER_POOL_ID) throw new Error("COGNITO_USER_POOL_ID must be set.");
  try {
    const res = await idp().send(
      new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: sub }),
    );
    return (
      res.UserAttributes?.find((a) => a.Name === "email")?.Value ?? null
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hosted-UI OAuth, for social sign-in (Google).
//
// The email + password flow above talks to the Cognito API directly. This one
// cannot: the user has to visit Google, so the browser is redirected through
// Cognito's hosted domain and comes back with an authorization code, which we
// exchange here for the same tokens the password flow returns.
// ---------------------------------------------------------------------------

const HOSTED_DOMAIN = process.env.COGNITO_HOSTED_DOMAIN;

/** Is social sign-in configured? Drives whether the button renders at all. */
export function socialSignInEnabled(): boolean {
  return !!HOSTED_DOMAIN && !!CLIENT_ID;
}

/** Where to send the browser to start "Continue with Google". */
export function googleAuthorizeUrl(redirectUri: string): string {
  if (!HOSTED_DOMAIN || !CLIENT_ID) {
    throw new Error("COGNITO_HOSTED_DOMAIN and COGNITO_CLIENT_ID must be set.");
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: redirectUri,
    identity_provider: "Google",
  });
  return `${HOSTED_DOMAIN}/oauth2/authorize?${params}`;
}

/**
 * Swap the authorization code for tokens.
 *
 * The app client has a secret, so this authenticates with HTTP Basic rather
 * than sending the secret in the body - which is what Cognito expects and what
 * the "invalid_client" error means when it is done the other way.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<Tokens> {
  const { CLIENT_ID: id, CLIENT_SECRET: secret } = requireConfig();
  if (!HOSTED_DOMAIN) throw new Error("COGNITO_HOSTED_DOMAIN must be set.");

  const res = await fetch(`${HOSTED_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: id,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as {
    id_token: string;
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    idToken: json.id_token,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
  };
}
