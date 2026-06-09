"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

export type JobFormState = { error?: string } | undefined;

const jobSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().min(1, "Description is required"),
    requirements: z.string().trim().min(1, "Requirements are required"),
    location: z.string().trim().max(200).optional(),
    salaryMin: z.number().int().nonnegative().nullable(),
    salaryMax: z.number().int().nonnegative().nullable(),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
    workMode: z.enum(["REMOTE", "ONSITE", "HYBRID"]),
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
    employmentType: formData.get("employmentType"),
    workMode: formData.get("workMode"),
    expiresAt: formData.get("expiresAt"),
  });
}

/** Interpret a YYYY-MM-DD date as end-of-day UTC (valid through that day). */
function expiryToTimestamp(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.000Z`).toISOString();
}

async function getActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isEmployer: false };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return { supabase, user, isEmployer: profile?.role === "EMPLOYER" };
}

export async function createJob(
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const { supabase, user, isEmployer } = await getActor();
  if (!user) return { error: "Please sign in." };
  if (!isEmployer) return { error: "Only employers can post jobs." };

  const parsed = parseJob(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      employer_id: user.id,
      title: d.title,
      description: d.description,
      requirements: d.requirements,
      location: d.location ?? null,
      salary_min: d.salaryMin,
      salary_max: d.salaryMax,
      employment_type: d.employmentType,
      work_mode: d.workMode,
      status: "OPEN",
      expires_at: expiryToTimestamp(d.expiresAt),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  redirect(`/jobs/${job.id}`);
}

export async function updateJob(
  jobId: string,
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const { supabase, user, isEmployer } = await getActor();
  if (!user) return { error: "Please sign in." };
  if (!isEmployer) return { error: "Only employers can edit jobs." };

  const parsed = parseJob(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  // RLS (jobs_update_own) ensures the employer can only update their own job.
  const { error } = await supabase
    .from("jobs")
    .update({
      title: d.title,
      description: d.description,
      requirements: d.requirements,
      location: d.location ?? null,
      salary_min: d.salaryMin,
      salary_max: d.salaryMax,
      employment_type: d.employmentType,
      work_mode: d.workMode,
      expires_at: expiryToTimestamp(d.expiresAt),
    })
    .eq("id", jobId);

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  redirect(`/jobs/${jobId}`);
}

export async function closeJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  // RLS ensures only the owning employer can update.
  await supabase.from("jobs").update({ status: "CLOSED" }).eq("id", jobId);
  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}

export async function reopenJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);
  await supabase
    .from("jobs")
    .update({ status: "OPEN", expires_at: expires.toISOString() })
    .eq("id", jobId);
  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}
