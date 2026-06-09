import {
  createResumeUploadUrl,
  setProfileResume,
} from "@/app/applications/actions";
import {
  RESUME_BUCKET,
  RESUME_CONTENT_TYPES,
  RESUME_MAX_BYTES,
  resumeExtension,
} from "@/lib/resume";
import { createClient } from "@/utils/supabase/client";

export type UploadResult =
  | { ok: true; filename: string }
  | { ok: false; error: string };

/**
 * Validate a resume file, upload it via a server-issued signed URL, and save it
 * as the user's profile default. Used by the resume manager and apply modal.
 */
export async function uploadResume(file: File): Promise<UploadResult> {
  const ext = resumeExtension(file.name);
  const contentType = RESUME_CONTENT_TYPES[ext];
  if (!contentType) {
    return {
      ok: false,
      error: "Upload a PDF or Word document (.pdf, .doc, .docx).",
    };
  }
  if (file.size > RESUME_MAX_BYTES) {
    return { ok: false, error: "File must be 5 MB or smaller." };
  }

  const issued = await createResumeUploadUrl(file.name);
  if (!issued.ok) return { ok: false, error: issued.error };

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(RESUME_BUCKET)
    .uploadToSignedUrl(issued.path, issued.token, file, { contentType });
  if (error) return { ok: false, error: "Upload failed. Please try again." };

  const saved = await setProfileResume(issued.path, file.name);
  if (!saved.ok) return { ok: false, error: saved.error };

  return { ok: true, filename: file.name };
}
