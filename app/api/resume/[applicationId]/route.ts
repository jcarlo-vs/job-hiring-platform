import type { NextRequest } from "next/server";

import { getUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { RESUME_CONTENT_TYPES, resumeExtension } from "@/lib/resume";
import { getResumeBytes } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Streams an application's resume same-origin so it embeds reliably (an iframe
 * or modal) without the cross-origin and expiry quirks of a presigned S3 link.
 *
 * Authorization is the applications_select RLS policy: reading the row as the
 * caller only succeeds for the applicant (their own application) or the employer
 * who owns the job. If they cannot read it, they get a 404. The object itself is
 * then fetched with the app's own S3 credentials, since the bucket is private.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;

  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Authorization is the applications_select policy: reading this row as the
  // caller only succeeds for the applicant or the owning employer. If they
  // cannot read it, they get a 404 - the permission question is answered by
  // attempting the read, not by a check that could drift.
  const app = await asUser((db) =>
    db.one<{ resume_path: string | null }>(
      `select resume_path from public.applications where id = $1`,
      [applicationId],
    ),
  );
  if (!app?.resume_path) return new Response("Not found", { status: 404 });

  let buffer: Buffer;
  try {
    buffer = await getResumeBytes(app.resume_path);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = resumeExtension(app.resume_path);
  const contentType = RESUME_CONTENT_TYPES[ext] ?? "application/octet-stream";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
