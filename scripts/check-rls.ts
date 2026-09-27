import assert from "node:assert/strict";

import { Client } from "pg";

/**
 * Proves Row Level Security actually denies cross-tenant access on Neon.
 *
 * This exists because the RLS context moved from Supabase (which verified a JWT
 * and provided auth.uid()) to a transaction-local setting we set ourselves. The
 * failure mode if that is wrong is not an error, it is one applicant reading
 * another applicant's application. So it gets a test.
 *
 * The most important case is `unset context`: if app.user_id is never set,
 * auth.uid() is NULL and every policy must deny. A regression that made the
 * owner connection serve user traffic would light this up immediately, because
 * the owner has rolbypassrls and would return everything.
 *
 * Run with: npm run check:rls
 */

const OWNER_URL = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;

const E = "e0000000-0000-0000-0000-00000000f001"; // employer
const A1 = "a0000000-0000-0000-0000-00000000f001"; // applicant who applied
const A2 = "a0000000-0000-0000-0000-00000000f002"; // unrelated applicant
const JOB = "10000000-0000-0000-0000-00000000f001";
const APP_ROW = "c0000000-0000-0000-0000-00000000f001";

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  try {
    assert.deepEqual(actual, expected);
    console.log(`PASS  ${name}  (${JSON.stringify(actual)})`);
  } catch {
    console.error(
      `FAIL  ${name}  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
    failures++;
  }
}

/** Count rows as app_user with app.user_id set (or deliberately unset). */
async function countAs(
  app: Client,
  userId: string | null,
  sql: string,
): Promise<number> {
  await app.query("begin");
  try {
    if (userId) {
      await app.query("select set_config('app.user_id', $1, true)", [userId]);
    }
    const res = await app.query(sql);
    return Number(res.rows[0].count);
  } finally {
    await app.query("commit");
  }
}

async function seed(owner: Client) {
  await cleanup(owner);
  await owner.query(
    `insert into public.profiles (id, role, full_name) values
       ($1,'EMPLOYER','RLS Fixture Employer'),
       ($2,'APPLICANT','RLS Fixture A1'),
       ($3,'APPLICANT','RLS Fixture A2')`,
    [E, A1, A2],
  );
  await owner.query(
    `insert into public.jobs
       (id, employer_id, title, description, requirements,
        employment_type, work_mode, status, expires_at)
     values ($1,$2,'RLS Fixture Job','d','r','FULL_TIME','REMOTE','OPEN',
             now() + interval '30 days')`,
    [JOB, E],
  );
  await owner.query(
    `insert into public.applications (id, job_id, applicant_id)
     values ($1,$2,$3)`,
    [APP_ROW, JOB, A1],
  );
}

async function cleanup(owner: Client) {
  await owner.query(`delete from public.applications where id = $1`, [APP_ROW]);
  await owner.query(`delete from public.jobs where id = $1`, [JOB]);
  await owner.query(`delete from public.profiles where id = any($1::uuid[])`, [
    [E, A1, A2],
  ]);
}

async function main() {
  if (!OWNER_URL || !APP_URL) {
    console.error(
      "FAIL  DATABASE_URL(_UNPOOLED) and APP_DATABASE_URL must both be set.",
    );
    process.exit(1);
  }

  const owner = new Client({ connectionString: OWNER_URL });
  const app = new Client({ connectionString: APP_URL });
  await owner.connect();
  await app.connect();

  try {
    // The app connection must NOT be able to bypass RLS. If this fails, every
    // other assertion below is meaningless.
    const who = await app.query(
      "select current_user, (select rolbypassrls from pg_roles where rolname = current_user) as bypass",
    );
    check("app connection does not bypass RLS", who.rows[0].bypass, false);

    await seed(owner);

    // Anonymous: only open jobs, nothing else.
    check(
      "anonymous sees no profiles",
      await countAs(app, null, "select count(*) from profiles"),
      0,
    );
    check(
      "anonymous sees no applications",
      await countAs(app, null, "select count(*) from applications"),
      0,
    );
    check(
      "anonymous sees the open job",
      await countAs(
        app,
        null,
        `select count(*) from jobs where id = '${JOB}'`,
      ),
      1,
    );

    // Each identity sees only its own profile row.
    for (const [name, id] of [
      ["employer", E],
      ["applicant A1", A1],
      ["applicant A2", A2],
    ] as const) {
      check(
        `${name} sees only their own profile`,
        await countAs(app, id, "select count(*) from profiles"),
        1,
      );
    }

    // The core of it.
    check(
      "applicant A1 sees their own application",
      await countAs(
        app,
        A1,
        `select count(*) from applications where id = '${APP_ROW}'`,
      ),
      1,
    );
    check(
      "employer sees an application on a job they own",
      await countAs(
        app,
        E,
        `select count(*) from applications where id = '${APP_ROW}'`,
      ),
      1,
    );
    check(
      "applicant A2 CANNOT read another applicant's application",
      await countAs(
        app,
        A2,
        `select count(*) from applications where id = '${APP_ROW}'`,
      ),
      0,
    );

    // Writes, not just reads.
    check(
      "applicant A2 CANNOT update another applicant's application",
      await countAs(
        app,
        A2,
        `with u as (update applications set stage = 'OFFER'
                    where id = '${APP_ROW}' returning 1)
         select count(*) as count from u`,
      ),
      0,
    );
    check(
      "employer CAN update an application on their own job",
      await countAs(
        app,
        E,
        `with u as (update applications set stage = 'SCREENED'
                    where id = '${APP_ROW}' returning 1)
         select count(*) as count from u`,
      ),
      1,
    );
    check(
      "applicant A2 CANNOT update someone else's job",
      await countAs(
        app,
        A2,
        `with u as (update jobs set title = 'hijacked'
                    where id = '${JOB}' returning 1)
         select count(*) as count from u`,
      ),
      0,
    );
  } finally {
    await cleanup(owner);
    await owner.end();
    await app.end();
  }

  if (failures > 0) {
    console.error(`\nRLS check FAILED (${failures} failing)`);
    process.exit(1);
  }
  console.log("\nRLS OK: policies deny cross-tenant reads and writes.");
}

main();
