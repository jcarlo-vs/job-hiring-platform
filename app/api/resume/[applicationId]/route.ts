import type { NextRequest } from "next/server";

import { getUser } from "@/lib/auth";
import { RESUME_BUCKET, RESUME_CONTENT_TYPES, resumeExtension } from "@/lib/resume";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Streams an application's resume same-origin so it embeds reliably (an iframe
 * or modal) without the cross-origin/expiry quirks of a Supabase signed URL.
 *
 * Authorization is the applications_select RLS policy: reading the row under the
 * user's own session only succeeds for the applicant (their own application) or
 * the employer who owns the job. If they can't read it, they get a 404. The file
 * itself is then fetched with the service role (the bucket is private).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;

  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("resume_path")
    .eq("id", applicationId)
    .single();
  if (!app?.resume_path) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(RESUME_BUCKET)
    .download(app.resume_path);
  if (error || !data) return new Response("Not found", { status: 404 });

  const ext = resumeExtension(app.resume_path);
  const contentType = RESUME_CONTENT_TYPES[ext] ?? "application/octet-stream";
  const buffer = Buffer.from(await data.arrayBuffer());

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
