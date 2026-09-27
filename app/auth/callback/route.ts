import { NextResponse, type NextRequest } from "next/server";

import { exchangeCodeForTokens } from "@/lib/cognito";
import { asAdmin } from "@/lib/db";
import { setSessionCookies } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where Cognito sends the browser after a hosted-UI sign-in (Google).
 *
 * The chain is: our app -> Cognito hosted UI -> Google -> back to Cognito ->
 * here, with an authorization code. We swap that for the same tokens the
 * password flow produces and set the same cookies, so everything downstream is
 * identical regardless of how someone signed in.
 *
 * A first-time Google user has no profile row and, unlike email signup, never
 * told us whether they are hiring or looking for work. They go to
 * /auth/complete to pick, because `profiles.role` is NOT NULL and guessing it
 * would quietly trap an employer in an applicant account.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    // The user declined at Google, or the provider rejected us.
    return NextResponse.redirect(new URL("/login?error=social", url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  // Must byte-match the redirect_uri sent to /oauth2/authorize, or Cognito
  // rejects the exchange.
  const redirectUri = `${url.origin}/auth/callback`;

  let sub: string;
  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const payload = JSON.parse(
      Buffer.from(tokens.idToken.split(".")[1], "base64url").toString("utf8"),
    ) as { sub: string };
    sub = payload.sub;
    await setSessionCookies(tokens, sub);
  } catch (err) {
    console.error("[auth/callback]", err);
    return NextResponse.redirect(new URL("/login?error=social", url.origin));
  }

  const profile = await asAdmin((db) =>
    db.one<{ id: string }>(`select id from public.profiles where id = $1`, [
      sub,
    ]),
  );

  return NextResponse.redirect(
    new URL(profile ? "/dashboard" : "/auth/complete", url.origin),
  );
}
