import { Pool, type PoolClient } from "pg";

/**
 * SERVER ONLY. Database access for Neon Postgres. Replaces the Supabase client.
 *
 * There are exactly two ways to reach the database, and the difference between
 * them is the entire security model:
 *
 *   asUser()  - connects as `app_user`, for which rolbypassrls is FALSE, inside
 *               a transaction that has SET LOCAL app.user_id. Every RLS policy
 *               applies. This is the default and should be used for anything
 *               acting on a signed-in person's behalf.
 *
 *   asAdmin() - connects as the database owner, for which rolbypassrls is TRUE.
 *               Every policy is bypassed. This is the direct equivalent of
 *               Supabase's service role, and the same rule applies: authorize
 *               in application code FIRST, then use it.
 *
 * Why the user id is read here rather than passed in: a call site that can pass
 * an id is a call site that can pass the wrong one, and a single wrong id is a
 * cross-tenant data leak in an app holding people's resumes. There is one place
 * that resolves identity, and it is this file.
 *
 * Why SET LOCAL and never SET: LOCAL is transaction-scoped, so when the pooler
 * hands this connection to the next request it cannot inherit the previous
 * user's id. Verified against Neon's pooled endpoint.
 *
 * Covered by scripts/check-rls.ts (npm run check:rls).
 */

declare global {
  var __tsPools: { user?: Pool; admin?: Pool } | undefined;
}

// Reused across hot reloads in dev and across warm invocations in Lambda, so a
// burst of requests does not open a new pool each time.
const pools = (globalThis.__tsPools ??= {});

function pool(kind: "user" | "admin"): Pool {
  const existing = pools[kind];
  if (existing) return existing;

  const url =
    kind === "user"
      ? process.env.APP_DATABASE_URL
      : process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      `${kind === "user" ? "APP_DATABASE_URL" : "DATABASE_URL"} is not set.`,
    );
  }

  const created = new Pool({
    connectionString: url,
    max: kind === "user" ? 5 : 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  // A pool that emits 'error' with no listener crashes the process.
  created.on("error", (err) => console.error(`[db:${kind}] idle client`, err));

  pools[kind] = created;
  return created;
}

/** What a callback gets. Deliberately not the raw client: no BEGIN/COMMIT. */
export type Db = {
  query: <R extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<R[]>;
  /** First row, or null. For the very common single-row lookup. */
  one: <R extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<R | null>;
};

function wrap(client: PoolClient): Db {
  return {
    async query(text, params) {
      const res = await client.query(text, params as never);
      return res.rows;
    },
    async one(text, params) {
      const res = await client.query(text, params as never);
      return (res.rows[0] ?? null) as never;
    },
  };
}

/**
 * Run queries as the signed-in user, with RLS enforced.
 *
 * Passing no signed-in user is allowed and meaningful: app.user_id stays unset,
 * auth.uid() returns NULL, and the policies fall back to what an anonymous
 * visitor may see (open jobs, nothing else). That is how the public job board
 * reads without a special case.
 */
export async function asUser<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const { getSessionUserId } = await import("@/lib/session");
  const userId = await getSessionUserId();

  const client = await pool("user").connect();
  try {
    await client.query("begin");
    if (userId) {
      // Parameterised on purpose. set_config is the only way to bind a value
      // here; SET LOCAL takes a literal and would be a SQL injection seam.
      await client.query("select set_config('app.user_id', $1, true)", [
        userId,
      ]);
    }
    const result = await fn(wrap(client));
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run queries as the database owner, bypassing every RLS policy.
 *
 * Only for paths that cannot work under RLS and have already checked
 * authorization in application code: the screening worker, reading applicant
 * names (the profiles policy exposes only your own row), writing the hiring
 * email log, and creating a profile at signup.
 */
export async function asAdmin<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool("admin").connect();
  try {
    return await fn(wrap(client));
  } finally {
    client.release();
  }
}
