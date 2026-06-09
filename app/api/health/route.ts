import { timingSafeEqual } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

// Never cache — the keep-alive depends on this handler executing a real query.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Constant-time Bearer-token check against CRON_SECRET. */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Trivial query that actually hits Postgres — this is what resets
  // Supabase's free-tier inactivity-pause timer (a static 200 would not).
  const { error } = await supabase
    .from("health_check")
    .select("id", { head: true, count: "exact" });

  if (error) {
    return Response.json(
      { ok: false, db: "down", error: error.message },
      { status: 503 },
    );
  }

  return Response.json({ ok: true, db: "up", ts: new Date().toISOString() });
}
