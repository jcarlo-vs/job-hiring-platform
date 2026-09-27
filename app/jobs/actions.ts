"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { enqueueScreeningBatch } from "@/lib/queue";

export type JobFormState = { error?: string } | undefined;

const jobSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().min(1, "Description is required"),
    requirements: z.string().trim().min(1, "Requirements are required"),
    location: z.string().trim().max(200).optional(),
    salaryMin: z.number().int().nonnegative().nullable(),
    salaryMax: z.number().int().nonnegative().nullable(),
    salaryPeriod: z.enum(["HOURLY", "MONTHLY", "ANNUAL"]),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
    workMode: z.enum(["REMOTE", "ONSITE", "HYBRID"]),
    category: z.enum([
      "SOFTWARE_ENGINEERING",
      "DATA_AI",
      "DESIGN",
      "PRODUCT",
      "MARKETING",
      "SALES",
      "FINANCE_ACCOUNTING",
      "OPERATIONS",
      "CUSTOMER_SUPPORT",
      "HEALTHCARE",
      "EDUCATION",
      "ENGINEERING_TRADES",
      "LEGAL",
      "WRITING_CONTENT",
      "OTHER",
    ]),
    expiresAt: z.string().min(1, "Expiry date is required"),
  })
  .refine(
    (d) =>
      d.salaryMin == null || d.salaryMax == null || d.salaryMax >= d.salaryMin,
    {
      message: "Maximum salary must be at least the minimum salary",
      path: ["salaryMax"],
    },
  );

function toNumberOrNull(value: FormDataEntryValue | null): number | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : NaN; // NaN is rejected by zod
}

function parseJob(formData: FormData) {
  const location =
    typeof formData.get("location") === "string"
      ? (formData.get("location") as string).trim()
      : "";
  return jobSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    requirements: formData.get("requirements"),
    location: location === "" ? undefined : location,
    salaryMin: toNumberOrNull(formData.get("salaryMin")),
    salaryMax: toNumberOrNull(formData.get("salaryMax")),
    salaryPeriod: formData.get("salaryPeriod"),
    employmentType: formData.get("employmentType"),
    workMode: formData.get("workMode"),
    category: formData.get("category"),
    expiresAt: formData.get("expiresAt"),
  });
}

/** Interpret a YYYY-MM-DD date as end-of-day UTC (valid through that day). */
function expiryToTimestamp(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.000Z`).toISOString();
}

async function getActor() {
  const user = await getUser();
  if (!user) return { user: null, isEmployer: false };
  const profile = await asUser((db) =>
    db.one<{ role: string }>(
      `select role from public.profiles where id = $1`,
      [user.sub],
    ),
  );
  return { user, isEmployer: profile?.role === "EMPLOYER" };
}

export async function createJob(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const { user, isEmployer } = await getActor();
  if (!user) return { error: "Please sign in." };
  if (!isEmployer) return { error: "Only employers can post jobs." };

  const parsed = parseJob(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  // jobs_insert_employer checks both employer_id = auth.uid() AND that the
  // caller really is an employer, so the role check above is defence in depth.
  let job: { id: string } | null;
  try {
    job = await asUser((db) =>
      db.one<{ id: string }>(
        `insert into public.jobs
           (employer_id, title, description, requirements, location,
            salary_min, salary_max, salary_period, employment_type,
            work_mode, category, status, expires_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'OPEN',$12)
         returning id`,
        [
          user.sub, d.title, d.description, d.requirements, d.location ?? null,
          d.salaryMin, d.salaryMax, d.salaryPeriod, d.employmentType,
          d.workMode, d.category, expiryToTimestamp(d.expiresAt),
        ],
      ),
    );
  } catch (err) {
    console.error("[createJob]", err);
    return { error: "Could not post the job." };
  }
  if (!job) return { error: "Could not post the job." };

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  redirect(`/jobs/${job.id}`);
}

export async function updateJob(
  jobId: string,
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const { user, isEmployer } = await getActor();
  if (!user) return { error: "Please sign in." };
  if (!isEmployer) return { error: "Only employers can edit jobs." };

  const parsed = parseJob(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  // Read current requirements first, to detect a change (for auto re-screen).
  const existing = await asUser((db) =>
    db.one<{ requirements: string }>(
      `select requirements from public.jobs where id = $1`,
      [jobId],
    ),
  );

  // jobs_update_own means a non-owner updates zero rows rather than being
  // rejected, which is the safer failure.
  const updated = await asUser((db) =>
    db.query<{ id: string }>(
      `update public.jobs
          set title = $2, description = $3, requirements = $4, location = $5,
              salary_min = $6, salary_max = $7, salary_period = $8,
              employment_type = $9, work_mode = $10, category = $11,
              expires_at = $12
        where id = $1
        returning id`,
      [
        jobId, d.title, d.description, d.requirements, d.location ?? null,
        d.salaryMin, d.salaryMax, d.salaryPeriod, d.employmentType,
        d.workMode, d.category, expiryToTimestamp(d.expiresAt),
      ],
    ),
  );
  if (updated.length === 0) return { error: "Could not update the job." };

  // Stretch: when the requirements change, the old AI scores no longer reflect
  // the bar. Reset every applicant on this job to PENDING (RLS-scoped via
  // owns_job) and re-enqueue screening; the worker re-scores against the new
  // requirements. Best-effort - a queue hiccup must not fail the edit.
  if (existing && existing.requirements !== d.requirements) {
    const apps = await asUser((db) =>
      db.query<{ id: string }>(
        `update public.applications set screening_status = 'PENDING'
          where job_id = $1
          returning id`,
        [jobId],
      ),
    );
    if (apps.length > 0) {
      // Screening queue only, batched. Never the email queue: re-scoring against
      // new requirements must not re-send a confirmation email to every applicant.
      try {
        await enqueueScreeningBatch(apps.map((a) => a.id));
      } catch (err) {
        console.error(`[job ${jobId}] failed to enqueue re-screen:`, err);
      }
    }
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/jobs/${jobId}/applicants`);
  redirect(`/jobs/${jobId}`);
}

export async function closeJob(jobId: string) {
  if (!(await getUser())) return;
  // RLS ensures only the owning employer can update.
  await asUser((db) =>
    db.query(`update public.jobs set status = 'CLOSED' where id = $1`, [jobId]),
  );
  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}

export async function reopenJob(jobId: string) {
  if (!(await getUser())) return;
  await asUser((db) =>
    db.query(
      `update public.jobs
          set status = 'OPEN', expires_at = now() + interval '30 days'
        where id = $1`,
      [jobId],
    ),
  );
  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}
