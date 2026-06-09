// Neutral resume constants/helpers (no server-only imports), safe for both
// client and server modules.

export const RESUME_BUCKET = "resumes";

export const RESUME_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function resumeExtension(nameOrPath: string): string {
  return (nameOrPath.split(".").pop() ?? "").toLowerCase();
}
