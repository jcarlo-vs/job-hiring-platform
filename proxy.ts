import { CognitoJwtVerifier } from "aws-jwt-verify";
import { NextResponse, type NextRequest } from "next/server";

import { refresh } from "@/lib/cognito";
import { SESSION_COOKIE_NAMES } from "@/lib/session";

// Next.js 16 renamed the `middleware` file convention to `proxy`.
//
// Runs on every non-asset request and does two things: keep the Cognito session
// alive, and gate access to protected routes.
//
// The refresh happens here rather than on a client-side timer because every
// page render already passes through this. That is the same property the
// Supabase SSR client had, and it is why no token ever needs to exist in
// browser JavaScript.
//
// The redirect is for speed, not security: Row Level Security in Postgres is
// the boundary. A request that slips past this still sees nothing it should not.

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/account",
  "/applications",
  "/jobs/new",
];

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function jwtVerifier() {
  verifier ??= CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID!,
    tokenUse: "id",
    clientId: CLIENT_ID!,
  });
  return verifier;
}

type Session = { signedIn: boolean; refreshed?: { id: string; maxAge: number } };

async function resolveSession(request: NextRequest): Promise<Session> {
  if (!USER_POOL_ID || !CLIENT_ID) return { signedIn: false };

  const idToken = request.cookies.get(SESSION_COOKIE_NAMES.id)?.value;
  if (idToken) {
    try {
      await jwtVerifier().verify(idToken);
      return { signedIn: true };
    } catch {
      // expired or invalid; fall through to refresh
    }
  }

  const refreshToken = request.cookies.get(SESSION_COOKIE_NAMES.refresh)?.value;
  const sub = request.cookies.get(SESSION_COOKIE_NAMES.sub)?.value;
  if (!refreshToken || !sub) return { signedIn: false };

  try {
    const tokens = await refresh(refreshToken, sub);
    return {
      signedIn: true,
      refreshed: { id: tokens.idToken, maxAge: tokens.expiresIn },
    };
  } catch {
    // Refresh token revoked or expired: the session is genuinely over.
    return { signedIn: false };
  }
}

/** Carry a refreshed token onto whatever response we end up returning. */
function withSession(res: NextResponse, session: Session): NextResponse {
  if (session.refreshed) {
    res.cookies.set(SESSION_COOKIE_NAMES.id, session.refreshed.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.refreshed.maxAge,
    });
  }
  return res;
}

export async function proxy(request: NextRequest) {
  const session = await resolveSession(request);

  const path = request.nextUrl.pathname;
  const isProtected =
    PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)) ||
    /^\/jobs\/[^/]+\/(edit|applicants)(\/.*)?$/.test(path);
  const isAuthPage = path === "/login" || path === "/signup";

  if (!session.signedIn && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path);
    return withSession(NextResponse.redirect(url), session);
  }

  if (session.signedIn && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withSession(NextResponse.redirect(url), session);
  }

  return withSession(NextResponse.next({ request }), session);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets and image files, so the session
     * is not refreshed on every asset request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
