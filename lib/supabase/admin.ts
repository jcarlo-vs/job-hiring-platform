import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client. SERVER ONLY - it bypasses RLS, so never import
 * this into a Client Component. Used for signed resume URLs, the apply-time
 * resume snapshot, and (Phase 4) the AI screening worker.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
