import { CognitoJwtVerifier } from "aws-jwt-verify";
import { cookies } from "next/headers";

import { refresh, type Tokens } from "@/lib/cognito";

/**
 * SERVER ONLY. The session: Cognito tokens in httpOnly cookies.
 *
 * The browser's JavaScript never sees a token. `proxy.ts` refreshes before a
 * page renders, so there is no client-side timer and no token in memory to
 * steal via XSS - the same shape the Supabase SSR client had, just with our own
 * cookies underneath.
 *
 * The ID token is the one sent to the database layer, because its `sub` is the
 * user id that profiles.id holds. It is signature-verified against the pool's
 * JWKS on every read rather than merely decoded: the cookie is httpOnly and
 * SameSite, but a forged identity is the worst possible failure here, so it is
 * checked properly.
 */

const ID_COOKIE = "ts_id";
const REFRESH_COOKIE = "ts_refresh";
const SUB_COOKIE = "ts_sub";

/** Refresh is scoped to its own path so it is not sent with every request. */
const REFRESH_PATH = "/";

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function jwtVerifier() {
  if (!USER_POOL_ID || !CLIENT_ID) {
    throw new Error("COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set.");
  }
  // Caches the pool's JWKS after the first fetch.
  verifier ??= CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID,
    tokenUse: "id",
    clientId: CLIENT_ID,
  });
  return verifier;
}

export type SessionUser = { sub: string; email: string | null };

/**
 * Verify the ID token cookie and return the user, or null.
 *
 * Returns null rather than throwing on an invalid or expired token: callers
 * treat "no session" and "bad session" identically, and RLS denies either way
 * because app.user_id stays unset.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(ID_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = await jwtVerifier().verify(token);
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
    };
  } catch {
    return null;
  }
}

/**
 * The single source of the RLS context. lib/db.ts calls this and nothing else,
 * so no call site can supply a user id of its own.
 */
export async function getSessionUserId(): Promise<string | null> {
  return (await getSessionUser())?.sub ?? null;
}

/** Write the session cookies after a successful sign-in, sign-up or refresh. */
export async function setSessionCookies(
  tokens: Tokens,
  sub: string,
): Promise<void> {
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";

  jar.set(ID_COOKIE, tokens.idToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expiresIn,
  });

  // Needed to compute the SECRET_HASH on refresh, and it is not a secret: the
  // sub is already inside the ID token.
  jar.set(SUB_COOKIE, sub, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  if (tokens.refreshToken) {
    jar.set(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: REFRESH_PATH,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export async function clearSessionCookies(): Promise<void> {
  const jar = await cookies();
  for (const name of [ID_COOKIE, SUB_COOKIE, REFRESH_COOKIE]) {
    jar.delete(name);
  }
}

/**
 * If the ID token has expired but a refresh token is present, mint a new one.
 * Returns the refreshed tokens so the caller can write them onto its response;
 * `proxy.ts` does this before the page renders.
 *
 * Returns null when there is nothing to do, which covers both "still valid" and
 * "no session at all".
 */
export async function refreshIfExpired(): Promise<{
  tokens: Tokens;
  sub: string;
} | null> {
  const jar = await cookies();
  const idToken = jar.get(ID_COOKIE)?.value;
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  const sub = jar.get(SUB_COOKIE)?.value;

  if (!refreshToken || !sub) return null;

  if (idToken) {
    try {
      await jwtVerifier().verify(idToken);
      return null; // still valid
    } catch {
      // fall through and refresh
    }
  }

  try {
    const tokens = await refresh(refreshToken, sub);
    return { tokens, sub };
  } catch {
    // Refresh token revoked or expired: the session is over.
    return null;
  }
}

export const SESSION_COOKIE_NAMES = {
  id: ID_COOKIE,
  refresh: REFRESH_COOKIE,
  sub: SUB_COOKIE,
} as const;
