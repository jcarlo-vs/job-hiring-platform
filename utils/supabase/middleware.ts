import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";

/**
 * Refreshes the Supabase auth session on every request and propagates the
 * refreshed cookies onto the response.
 *
 * Phase 0: refresh only. Route protection / redirects for unauthenticated
 * users are added in Phase 1.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run any code between `createServerClient` and
  // `getUser()`. `getUser()` revalidates the token and writes the refreshed
  // session cookies; inserting logic here causes hard-to-debug random logouts.
  await supabase.auth.getUser();

  // Must return THIS response object so the refreshed cookies are preserved.
  return supabaseResponse;
}
