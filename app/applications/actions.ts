"use server";

import { revalidatePath } from "next/cache";

import {
  RESUME_BUCKET,
  RESUME_CONTENT_TYPES,
  resumeExtension,
} from "@/lib/resume";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type UploadUrlResult =
  | { ok: true; path: string; token: string }
  | { ok: false; error: string };

type ActionResult = { ok: true } | { ok: false; error: string };

/** Issue a signed upload URL for the current user's profile resume. */
export async function createResumeUploadUrl(
  filename: string,
): Promise<UploadUrlResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const ext = resumeExtension(filename);
  if (!RESUME_CONTENT_TYPES[ext]) {
    return {
      ok: false,
      error: "Upload a PDF or Word document (.pdf, .doc, .docx).",
    };
  }

  const path = `profiles/${user.id}/cv.${ext}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(RESUME_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data?.token) {
    return {
      ok: false,
      error: "Could not start the upload. Please try again.",
    };
  }
  return { ok: true, path: data.path ?? path, token: data.token };
}

/** Save the uploaded resume as the user's profile default. */
export async function setProfileResume(
  path: string,
  filename: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!path.startsWith(`profiles/${user.id}/`)) {
    return { ok: false, error: "Invalid upload path." };
  }

  const { data: prev } = await supabase
    .from("profiles")
    .select("resume_path")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({
      resume_path: path,
      resume_filename: filename,
      resume_uploaded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  if (prev?.resume_path && prev.resume_path !== path) {
    const admin = createAdminClient();
    await admin.storage.from(RESUME_BUCKET).remove([prev.resume_path]);
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/** A short-lived signed URL for the current user's own resume. */
export async function getMyResumeUrl(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("resume_path")
    .eq("id", user.id)
    .single();
  if (!profile?.resume_path) return { ok: false, error: "No resume on file." };

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(profile.resume_path, 120);
  if (error || !data?.signedUrl) {
    return { ok: false, error: "Could not open the resume." };
  }
  return { ok: true, url: data.signedUrl };
}

/** Apply to a job using the profile resume, snapshotting it per application. */
export async function applyToJob(jobId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, resume_path")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, error: "Profile not found." };
  if (profile.role !== "APPLICANT") {
    return { ok: false, error: "Only job seekers can apply." };
  }
  if (!profile.resume_path) return { ok: false, error: "no_resume" };

  const ext = resumeExtension(profile.resume_path);
  const appId = crypto.randomUUID();
  const destPath = `${jobId}/${appId}.${ext}`;

  // Insert under the user session so RLS enforces: own applicant_id, job OPEN
  // and not expired, and one application per job (unique constraint).
  const { error: insertError } = await supabase.from("applications").insert({
    id: appId,
    job_id: jobId,
    applicant_id: user.id,
    resume_path: destPath,
  });
  if (insertError) {
    if (insertError.code === "23505")
      return { ok: false, error: "already_applied" };
    return { ok: false, error: "unavailable" };
  }

  // Snapshot the profile resume into the application path (service role).
  const admin = createAdminClient();
  const { error: copyError } = await admin.storage
    .from(RESUME_BUCKET)
    .copy(profile.resume_path, destPath);
  if (copyError) {
    await admin.from("applications").delete().eq("id", appId);
    return {
      ok: false,
      error: "Could not attach your resume. Please try again.",
    };
  }

  // Phase 4 enqueues AI screening here; screening_status stays PENDING for now.
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}
