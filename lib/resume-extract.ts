import { extractRawText } from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

import { RESUME_BUCKET, resumeExtension } from "@/lib/resume";
import { createAdminClient } from "@/lib/supabase/admin";

// SERVER ONLY. unpdf ships a serverless PDF.js build and mammoth needs Node;
// both run in the Inngest worker on the Node runtime, never in the browser.

/** Upper bound on resume text handed to the model (characters) - a long CV. */
const MAX_RESUME_CHARS = 40_000;

/** Below this, treat extraction as failed (scanned image, empty, or corrupt). */
const MIN_RESUME_CHARS = 20;

/**
 * Download an application's snapshotted resume from the private bucket (service
 * role, so it bypasses storage RLS) and extract its plain text. PDF via unpdf,
 * .doc/.docx via mammoth. Throws on an unsupported type or empty extraction so
 * the worker marks the screening ERROR rather than feeding the model junk.
 */
export async function extractResumeText(resumePath: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(RESUME_BUCKET)
    .download(resumePath);
  if (error || !data) {
    throw new Error(
      `Could not download resume at ${resumePath}: ${error?.message ?? "missing"}`,
    );
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const ext = resumeExtension(resumePath);

  let text: string;
  if (ext === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  } else if (ext === "docx" || ext === "doc") {
    const result = await extractRawText({ buffer });
    text = result.value;
  } else {
    throw new Error(`Unsupported resume type: .${ext}`);
  }

  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < MIN_RESUME_CHARS) {
    throw new Error(
      "Resume produced no extractable text (scanned image or empty file?).",
    );
  }
  return text.slice(0, MAX_RESUME_CHARS);
}
