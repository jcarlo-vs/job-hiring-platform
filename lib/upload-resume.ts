import {
  createResumeUploadUrl,
  setProfileResume,
} from "@/app/applications/actions";
import {
  RESUME_CONTENT_TYPES,
  RESUME_MAX_BYTES,
  resumeExtension,
} from "@/lib/resume";

export type UploadResult =
  | { ok: true; filename: string }
  | { ok: false; error: string };

/**
 * Validate a resume file, upload it straight to S3 with a server-issued
 * presigned POST, and save it as the user's profile default.
 *
 * The bytes go browser -> S3 directly and never pass through the server, so a
 * large PDF cannot tie up a serverless function. The checks here are a courtesy
 * for a fast error message; the real limits live in the POST policy the server
 * signed, which S3 enforces regardless of what this code does.
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

  // Field order matters to S3: every policy field must precede the file.
  const form = new FormData();
  for (const [k, v] of Object.entries(issued.fields)) form.append(k, v);
  form.append("file", file);

  const res = await fetch(issued.url, { method: "POST", body: form });
  if (!res.ok) {
    // A 403 here is usually the policy rejecting the file, not a network fault.
    return { ok: false, error: "Upload failed. Please try again." };
  }

  const saved = await setProfileResume(issued.path, file.name);
  if (!saved.ok) return { ok: false, error: saved.error };

  return { ok: true, filename: file.name };
}
