import { timingSafeEqual } from "node:crypto";

import { asAdmin } from "@/lib/db";

// Never cache: the point is that the handler actually executes a query.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Liveness check: is the app up and can it reach the database?
 *
 * This used to exist to keep a free-tier Supabase project from auto-pausing
 * after a week of inactivity, which is why it runs a real query rather than
 * returning a static 200. Neon has no such pause to prevent - it scales to zero
 * and back in about half a second - so the GitHub Actions cron that hit this
 * was removed. It stays as an ordinary health endpoint.
 */

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

  try {
    await asAdmin((db) => db.one(`select id from public.health_check limit 1`));
  } catch (err) {
    return Response.json(
      {
        ok: false,
        db: "down",
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 503 },
    );
  }

  return Response.json({ ok: true, db: "up", ts: new Date().toISOString() });
}
