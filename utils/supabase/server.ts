import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * `cookies()` is async in Next 15+, so this helper is async. Always authorize
 * with `supabase.auth.getUser()` (verified against the Auth server) — never
 * `getSession()`, which reads spoofable, unrevalidated cookie data.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, which cannot write
            // cookies. Safe to ignore because the middleware refreshes the
            // session on every request.
          }
        },
      },
    },
  );
}
