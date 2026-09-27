// Demo seed: one real employer (Nimbus Labs) that owns a populated job board
// across categories, plus a few applicants with pre-filled screening results so
// the dashboard, pipeline, funnel, and applicant-transparency views look alive
// without needing the live screening worker to run.
//
// Run once on a fresh DB:
//   node --env-file=.env.local scripts/seed.mjs
//
// It connects as the database owner (bypasses RLS) and creates Cognito users
// already confirmed, so the demo accounts can sign in immediately.
//
// Idempotent: running it again deletes the demo users and their rows first.

import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Client } from "pg";

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const poolId = process.env.COGNITO_USER_POOL_ID;
if (!connectionString || !poolId) {
  console.error("Missing DATABASE_URL / COGNITO_USER_POOL_ID");
  process.exit(1);
}

const db = new Client({ connectionString });
const idp = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION ?? "ap-southeast-1",
});

// Documented in the README. Must satisfy the pool's password policy: 12+ chars,
// upper, lower, number, symbol.
const PASSWORD = "Demo!Screen2026";
const in30Days = new Date(Date.now() + 30 * 86400 * 1000).toISOString();

/**
 * Create a confirmed Cognito user and its profile row.
 *
 * The profile used to be created by the handle_new_user trigger on auth.users.
 * That table is gone, so the id comes back from Cognito as `sub` and the row is
 * inserted here - the same thing the signup server action does.
 */
async function makeUser({ email, full_name, role, company_name, phone }) {
  const created = await idp.send(
    new AdminCreateUserCommand({
      UserPoolId: poolId,
      Username: email,
      MessageAction: "SUPPRESS",
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
      ],
    }),
  );
  await idp.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: poolId,
      Username: email,
      Password: PASSWORD,
      Permanent: true,
    }),
  );

  const sub = created.User.Attributes.find((a) => a.Name === "sub").Value;
  await db.query(
    `insert into public.profiles (id, role, full_name, company_name, phone)
     values ($1, $2, $3, nullif($4,''), nullif($5,''))`,
    [sub, role, full_name, company_name ?? "", phone ?? ""],
  );
  return sub;
}

/** Remove any previous run, so seeding twice is safe. */
async function reset() {
  const emails = [
    "recruiter@talentscreen.dev",
    ...Object.values(APPLICANTS).map((a) => a.email),
  ];
  for (const email of emails) {
    const found = await idp.send(
      new ListUsersCommand({
        UserPoolId: poolId,
        Filter: `email = "${email}"`,
        Limit: 1,
      }),
    );
    for (const u of found.Users ?? []) {
      const sub = u.Attributes.find((a) => a.Name === "sub").Value;
      await idp.send(
        new AdminDeleteUserCommand({ UserPoolId: poolId, Username: u.Username }),
      );
      // jobs and applications cascade from profiles.
      await db.query(`delete from public.profiles where id = $1`, [sub]);
    }
  }
}

const JOBS = [
  {
    title: "Senior Frontend Engineer (React)",
    category: "SOFTWARE_ENGINEERING",
    employment_type: "FULL_TIME",
    work_mode: "REMOTE",
    location: "Remote (US)",
    salary_min: 130000,
    salary_max: 170000,
    salary_period: "ANNUAL",
    description:
      "Own the candidate-facing UI of our hiring platform end to end. You will ship features weekly and work closely with design and backend on a small, high-trust team.",
    requirements:
      "- 4+ years building production web apps with React and TypeScript\n- Strong CSS and accessibility fundamentals\n- Comfortable with REST APIs and modern build tooling\n- Bonus: Next.js App Router, Tailwind",
  },
  {
    title: "Backend Engineer (Node + Postgres)",
    category: "SOFTWARE_ENGINEERING",
    employment_type: "FULL_TIME",
    work_mode: "HYBRID",
    location: "Austin, TX",
    salary_min: 120000,
    salary_max: 160000,
    salary_period: "ANNUAL",
    description:
      "Design and run the services behind our screening pipeline: APIs, background jobs, and data models. You will care about correctness, observability, and clean schemas.",
    requirements:
      "- 4+ years with Node.js and a SQL database (Postgres preferred)\n- Experience with queues / background jobs and idempotency\n- Solid understanding of auth and row-level security\n- Bonus: AWS (SQS, Lambda), Terraform",
  },
  {
    title: "Machine Learning Engineer",
    category: "DATA_AI",
    employment_type: "FULL_TIME",
    work_mode: "REMOTE",
    location: "Remote (Global)",
    salary_min: 150000,
    salary_max: 200000,
    salary_period: "ANNUAL",
    description:
      "Improve the models and prompts that power explainable resume screening. You will build evals, measure quality, and ship improvements that hiring teams can trust.",
    requirements:
      "- Strong Python and applied ML experience\n- Experience evaluating LLM outputs and building eval harnesses\n- Comfortable with prompt engineering and structured outputs\n- Bonus: retrieval, fine-tuning",
  },
  {
    title: "Data Analyst",
    category: "DATA_AI",
    employment_type: "FULL_TIME",
    work_mode: "ONSITE",
    location: "New York, NY",
    salary_min: 80000,
    salary_max: 110000,
    salary_period: "ANNUAL",
    description:
      "Turn product and hiring-funnel data into decisions. You will build dashboards, answer ad-hoc questions, and help the team understand what is working.",
    requirements:
      "- 2+ years in analytics with strong SQL\n- Experience with a BI tool (Metabase, Looker, or similar)\n- Clear communication of findings to non-technical stakeholders\n- Bonus: Python, dbt",
  },
  {
    title: "Product Designer",
    category: "DESIGN",
    employment_type: "FULL_TIME",
    work_mode: "REMOTE",
    location: "Remote (US)",
    salary_min: 95000,
    salary_max: 135000,
    salary_period: "ANNUAL",
    description:
      "Design clear, humane hiring experiences for both employers and job seekers. You will own flows end to end, from research to polished UI.",
    requirements:
      "- 3+ years of product design with a strong portfolio\n- Fluency in Figma and design systems\n- Comfortable shipping with engineers and iterating fast\n- Bonus: motion, accessibility expertise",
  },
  {
    title: "Product Manager",
    category: "PRODUCT",
    employment_type: "FULL_TIME",
    work_mode: "HYBRID",
    location: "Austin, TX",
    salary_min: 130000,
    salary_max: 175000,
    salary_period: "ANNUAL",
    description:
      "Define what we build and why. You will talk to users, shape the roadmap, and partner with design and engineering to ship outcomes, not just features.",
    requirements:
      "- 3+ years of product management on a software product\n- Strong written communication and prioritization\n- Comfortable with data and customer research\n- Bonus: marketplace or B2B SaaS experience",
  },
  {
    title: "Growth Marketing Manager",
    category: "MARKETING",
    employment_type: "FULL_TIME",
    work_mode: "REMOTE",
    location: "Remote (US)",
    salary_min: 90000,
    salary_max: 125000,
    salary_period: "ANNUAL",
    description:
      "Own acquisition across channels. You will run experiments, measure what converts, and scale the channels that bring quality employers and candidates.",
    requirements:
      "- 3+ years in growth or performance marketing\n- Hands-on with paid, SEO, and lifecycle email\n- Strong analytical mindset and A/B testing discipline\n- Bonus: content and brand experience",
  },
  {
    title: "Account Executive",
    category: "SALES",
    employment_type: "FULL_TIME",
    work_mode: "ONSITE",
    location: "Chicago, IL",
    salary_min: 70000,
    salary_max: 95000,
    salary_period: "ANNUAL",
    description:
      "Bring new employers onto the platform. You will run the full cycle from prospecting to close and become a trusted advisor to hiring teams.",
    requirements:
      "- 2+ years of full-cycle B2B sales\n- Track record of hitting quota\n- Excellent discovery and communication skills\n- Bonus: HR tech or SaaS experience",
  },
  {
    title: "Senior Accountant",
    category: "FINANCE_ACCOUNTING",
    employment_type: "FULL_TIME",
    work_mode: "HYBRID",
    location: "Denver, CO",
    salary_min: 85000,
    salary_max: 110000,
    salary_period: "ANNUAL",
    description:
      "Own the monthly close and keep our books clean as we grow. You will handle reconciliations, reporting, and partner with leadership on planning.",
    requirements:
      "- 4+ years in accounting; CPA a plus\n- Strong GAAP knowledge and month-end close experience\n- Advanced spreadsheet skills\n- Bonus: startup or SaaS finance experience",
  },
  {
    title: "Customer Support Specialist",
    category: "CUSTOMER_SUPPORT",
    employment_type: "FULL_TIME",
    work_mode: "REMOTE",
    location: "Remote (US)",
    salary_min: 50000,
    salary_max: 65000,
    salary_period: "ANNUAL",
    description:
      "Be the friendly, fast first response for employers and job seekers. You will resolve issues, spot patterns, and feed insights back to the product team.",
    requirements:
      "- 1+ year in customer support or success\n- Excellent written communication and empathy\n- Comfortable with a help desk and documentation\n- Bonus: technical troubleshooting",
  },
  {
    title: "Operations Coordinator",
    category: "OPERATIONS",
    employment_type: "FULL_TIME",
    work_mode: "ONSITE",
    location: "Seattle, WA",
    salary_min: 60000,
    salary_max: 80000,
    salary_period: "ANNUAL",
    description:
      "Keep the company running smoothly. You will own internal processes, vendor coordination, and the small things that make a team effective.",
    requirements:
      "- 2+ years in operations or program coordination\n- Highly organized and detail-oriented\n- Comfortable juggling many small workstreams\n- Bonus: experience at an early-stage startup",
  },
  {
    title: "Technical Writer (Contract)",
    category: "WRITING_CONTENT",
    employment_type: "CONTRACT",
    work_mode: "REMOTE",
    location: "Remote (Global)",
    salary_min: 45,
    salary_max: 70,
    salary_period: "HOURLY",
    description:
      "Make our product and APIs easy to understand. You will write docs, guides, and release notes that developers and employers actually enjoy reading.",
    requirements:
      "- 2+ years writing developer or product documentation\n- Ability to read code and explain it clearly\n- Strong editing and information architecture\n- Bonus: experience documenting APIs",
  },
];

// Applications to seed, with pre-filled screening so the views look real.
// jobIndex points into JOBS above; applicant points into the applicants list.
const APPLICATIONS = [
  {
    jobIndex: 0,
    applicant: "ada",
    stage: "SCREENED",
    score: 88,
    rec: "STRONG",
    matched: ["React", "TypeScript", "5 years frontend", "Accessibility"],
    missing: ["Next.js App Router"],
    flags: [],
    summary:
      "Strong frontend match with deep React + TypeScript experience and a focus on accessibility. Slightly light on Next.js App Router but clearly able to ramp quickly.",
  },
  {
    jobIndex: 0,
    applicant: "liam",
    stage: "SCREENED",
    score: 61,
    rec: "MODERATE",
    matched: ["React", "CSS fundamentals"],
    missing: ["TypeScript depth", "REST API experience"],
    flags: ["Most recent role was design-leaning, not heavy engineering"],
    summary:
      "Partial match: solid React and design sense, but lighter on TypeScript and backend integration than the role asks for. Worth a conversation.",
  },
  {
    jobIndex: 0,
    applicant: "maya",
    stage: "SCREENED",
    score: 27,
    rec: "WEAK",
    matched: ["Strong communication"],
    missing: [
      "React",
      "TypeScript",
      "Production web app experience",
      "CSS fundamentals",
    ],
    flags: ["Background is in marketing, not software engineering"],
    summary:
      "Background is in marketing rather than engineering; does not meet the core technical requirements for this role.",
  },
  {
    jobIndex: 2,
    applicant: "ada",
    stage: "TECH_INTERVIEW",
    score: 82,
    rec: "STRONG",
    matched: ["Python", "Applied ML", "Eval harnesses", "Structured outputs"],
    missing: ["Fine-tuning experience"],
    flags: [],
    summary:
      "Strong applied-ML candidate with real evaluation experience, which maps directly to our screening-quality work.",
  },
  {
    jobIndex: 4,
    applicant: "liam",
    stage: "OFFER",
    score: 91,
    rec: "STRONG",
    matched: ["Product design", "Figma", "Design systems", "Strong portfolio"],
    missing: [],
    flags: [],
    summary:
      "Excellent product-design match: strong portfolio, systems thinking, and a track record of shipping with engineers.",
  },
];

const APPLICANTS = {
  ada: {
    email: "ada.demo@talentscreen.dev",
    full_name: "Ada Reyes",
    phone: "+1 415 555 0142",
    prefs: ["SOFTWARE_ENGINEERING", "DATA_AI"],
  },
  liam: {
    email: "liam.demo@talentscreen.dev",
    full_name: "Liam Cruz",
    phone: "+1 415 555 0188",
    prefs: ["DESIGN", "PRODUCT"],
  },
  maya: {
    email: "maya.demo@talentscreen.dev",
    full_name: "Maya Santos",
    phone: "+1 415 555 0173",
    prefs: ["MARKETING"],
  },
};

async function main() {
  await db.connect();

  console.log("Clearing any previous seed...");
  await reset();

  console.log("Seeding employer...");
  const employerId = await makeUser({
    email: "recruiter@talentscreen.dev",
    full_name: "Jordan Avery",
    role: "EMPLOYER",
    company_name: "Nimbus Labs",
  });

  console.log(`Inserting ${JOBS.length} jobs...`);
  const jobIds = [];
  for (const j of JOBS) {
    const { rows } = await db.query(
      `insert into public.jobs
         (employer_id, title, description, requirements, location,
          salary_min, salary_max, salary_period, employment_type,
          work_mode, category, status, expires_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'OPEN',$12)
       returning id`,
      [
        employerId, j.title, j.description, j.requirements, j.location ?? null,
        j.salary_min ?? null, j.salary_max ?? null, j.salary_period ?? "ANNUAL",
        j.employment_type, j.work_mode, j.category, in30Days,
      ],
    );
    jobIds.push(rows[0].id);
  }

  console.log("Seeding applicants...");
  const applicantIds = {};
  for (const [key, a] of Object.entries(APPLICANTS)) {
    const id = await makeUser({
      email: a.email,
      full_name: a.full_name,
      role: "APPLICANT",
      phone: a.phone,
    });
    applicantIds[key] = id;
    await db.query(
      `update public.profiles
          set preferred_categories = $2::public.job_category[],
              onboarded_at = now()
        where id = $1`,
      [id, a.prefs],
    );
  }

  console.log(`Inserting ${APPLICATIONS.length} applications with screening...`);
  for (const a of APPLICATIONS) {
    await db.query(
      `insert into public.applications
         (job_id, applicant_id, stage, screening_status, ai_score,
          ai_recommendation, ai_matched, ai_missing, ai_flags, ai_summary)
       values ($1,$2,$3::public.application_stage,'DONE',$4,
               $5::public.ai_recommendation,$6::jsonb,$7::jsonb,$8::jsonb,$9)`,
      [
        jobIds[a.jobIndex], applicantIds[a.applicant], a.stage, a.score, a.rec,
        JSON.stringify(a.matched), JSON.stringify(a.missing),
        JSON.stringify(a.flags), a.summary,
      ],
    );
  }

  console.log("\nSeed complete.\n");
  console.log("Employer login:");
  console.log(`  recruiter@talentscreen.dev / ${PASSWORD}  (Nimbus Labs)`);
  console.log("Applicant logins:");
  for (const a of Object.values(APPLICANTS)) {
    console.log(`  ${a.email} / ${PASSWORD}  (${a.full_name})`);
  }
}

main()
  .then(() => db.end())
  .catch(async (e) => {
    console.error("\nSeed failed:", e.message);
    await db.end().catch(() => {});
    process.exit(1);
  });
