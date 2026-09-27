"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth";
import { asAdmin, asUser } from "@/lib/db";
import { enqueueApplicationReceived, enqueueScreening } from "@/lib/queue";
import { RESUME_CONTENT_TYPES, resumeExtension } from "@/lib/resume";
import { copyResume, createResumeUpload, getResumeUrl } from "@/lib/storage";

type UploadUrlResult =
  | { ok: true; path: string; url: string; fields: Record<string, string> }
  | { ok: false; error: string };

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Issue a presigned upload for the current user's profile resume.
 *
 * The POST policy caps content type and size server side, so a client cannot
 * upload something else to a path we signed.
 */
export async function createResumeUploadUrl(
  filename: string,
): Promise<UploadUrlResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const ext = resumeExtension(filename);
  const contentType = RESUME_CONTENT_TYPES[ext];
  if (!contentType) {
    return {
      ok: false,
      error: "Upload a PDF or Word document (.pdf, .doc, .docx).",
    };
  }

  const path = `profiles/${user.sub}/cv.${ext}`;
  try {
    const { url, fields } = await createResumeUpload(path, contentType);
    return { ok: true, path, url, fields };
  } catch (err) {
    console.error("[resume-upload]", err);
    return { ok: false, error: "Could not start the upload. Please try again." };
  }
}

/** Save the uploaded resume as the user's profile default. */
export async function setProfileResume(
  path: string,
  filename: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!path.startsWith(`profiles/${user.sub}/`)) {
    return { ok: false, error: "Invalid upload path." };
  }

  // Under RLS: profiles_update_own means this can only ever touch their row.
  const updated = await asUser((db) =>
    db.query<{ id: string }>(
      `update public.profiles
          set resume_path = $1, resume_filename = $2, resume_uploaded_at = now()
        where id = $3
        returning id`,
      [path, filename, user.sub],
    ),
  );
  if (updated.length === 0) {
    return { ok: false, error: "Could not save your resume." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/** A short-lived signed URL for the current user's own resume. */
export async function getMyResumeUrl(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const profile = await asUser((db) =>
    db.one<{ resume_path: string | null }>(
      `select resume_path from public.profiles where id = $1`,
      [user.sub],
    ),
  );
  if (!profile?.resume_path) return { ok: false, error: "No resume on file." };

  try {
    return { ok: true, url: await getResumeUrl(profile.resume_path, 120) };
  } catch {
    return { ok: false, error: "Could not open the resume." };
  }
}

/** Apply to a job using the profile resume, snapshotting it per application. */
export async function applyToJob(jobId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const profile = await asUser((db) =>
    db.one<{ role: string; resume_path: string | null }>(
      `select role, resume_path from public.profiles where id = $1`,
      [user.sub],
    ),
  );
  if (!profile) return { ok: false, error: "Profile not found." };
  if (profile.role !== "APPLICANT") {
    return { ok: false, error: "Only job seekers can apply." };
  }
  if (!profile.resume_path) return { ok: false, error: "no_resume" };

  const ext = resumeExtension(profile.resume_path);
  const appId = crypto.randomUUID();
  const destPath = `${jobId}/${appId}.${ext}`;

  // Inserted as the user, so the database enforces it: own applicant_id, job
  // OPEN and not expired, one application per job. None of that is checked here.
  try {
    await asUser((db) =>
      db.query(
        `insert into public.applications (id, job_id, applicant_id, resume_path)
         values ($1, $2, $3, $4)`,
        [appId, jobId, user.sub, destPath],
      ),
    );
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "23505") return { ok: false, error: "already_applied" };
    // 42501 is insufficient_privilege: the RLS check failed, which here means
    // the job is closed, expired, or gone.
    if (code === "42501") return { ok: false, error: "unavailable" };
    console.error("[apply] insert failed", err);
    return { ok: false, error: "unavailable" };
  }

  // Snapshot the profile resume onto the application path, so replacing the CV
  // later does not rewrite what was actually submitted.
  try {
    await copyResume(profile.resume_path, destPath);
  } catch (err) {
    console.error("[apply] resume copy failed", err);
    await asAdmin((db) =>
      db.query(`delete from public.applications where id = $1`, [appId]),
    );
    return {
      ok: false,
      error: "Could not attach your resume. Please try again.",
    };
  }

  // Enqueue AI screening and the applicant's confirmation email. Two separate
  // queues, and this is the only path that writes to the email one.
  //
  // Best-effort: the application is already saved, so a transient queue error
  // must not fail the apply - the row stays PENDING and an employer can
  // re-screen it.
  try {
    await Promise.all([
      enqueueScreening(appId),
      enqueueApplicationReceived(appId),
    ]);
  } catch (err) {
    console.error(`[apply] failed to enqueue background work for ${appId}:`, err);
  }

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Employer-only: re-run AI screening for an application on one of their jobs.
 *
 * Ownership is checked here in application code because the status reset uses
 * the admin connection, which bypasses RLS. Authorize first, then bypass.
 */
export async function rescreenApplication(
  applicationId: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const owned = await asAdmin((db) =>
    db.one<{ id: string }>(
      `select a.id
         from public.applications a
         join public.jobs j on j.id = a.job_id
        where a.id = $1 and j.employer_id = $2`,
      [applicationId, user.sub],
    ),
  );
  if (!owned) return { ok: false, error: "Not authorized." };

  try {
    await asAdmin((db) =>
      db.query(
        `update public.applications set screening_status = 'PENDING' where id = $1`,
        [applicationId],
      ),
    );
  } catch {
    return { ok: false, error: "Could not reset screening." };
  }

  // Screening queue only. Deliberately not the email queue: a re-screen is not a
  // new application, and emailing "we received your application" again would be
  // wrong (which is exactly what happened when both workers shared one event).
  try {
    await enqueueScreening(applicationId);
  } catch {
    return { ok: false, error: "Could not queue re-screening. Please retry." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
