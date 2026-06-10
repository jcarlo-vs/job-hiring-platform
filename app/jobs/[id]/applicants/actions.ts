"use server";

import { revalidatePath } from "next/cache";

import { PIPELINE_STAGES, type ApplicationStage } from "@/lib/applications";
import { composeEmailHtml, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Move a candidate to a new stage. The update runs under the employer's own
 * session, so the `applications_update_employer` RLS policy (private.owns_job)
 * enforces that only the employer who owns this application's job can change it
 * - a non-owner's update simply matches zero rows. The stage value is validated
 * here as defense in depth. Applicants are emailed deliberately by the manager
 * (sendCandidateEmail), not automatically on every move.
 */
export async function updateApplicationStage(
  jobId: string,
  applicationId: string,
  stage: ApplicationStage,
): Promise<ActionResult> {
  if (!PIPELINE_STAGES.includes(stage)) {
    return { ok: false, error: "Invalid stage." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { data, error } = await supabase
    .from("applications")
    .update({ stage })
    .eq("id", applicationId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Not found, or you do not own this job." };
  }

  revalidatePath(`/jobs/${jobId}/applicants`);
  revalidatePath(`/jobs/${jobId}/applicants/${applicationId}`);
  return { ok: true };
}

type SendResult =
  | { ok: true; delivered: boolean }
  | { ok: false; error: string };

/**
 * Send a hiring email the manager composed on the candidate page. Verifies the
 * caller owns the application's job, sends via Resend, and logs the send to
 * application_emails (service role; that table has no client policies). Returns
 * `delivered: false` when RESEND_API_KEY is unset - the send no-ops but the
 * action still succeeds and logs, so the flow is usable locally.
 */
export async function sendCandidateEmail(
  jobId: string,
  applicationId: string,
  kind: string,
  subject: string,
  body: string,
): Promise<SendResult> {
  if (!subject.trim() || !body.trim()) {
    return { ok: false, error: "Subject and message are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select("applicant_id, job_id")
    .eq("id", applicationId)
    .single();
  if (!app) return { ok: false, error: "Application not found." };

  const { data: job } = await admin
    .from("jobs")
    .select("employer_id")
    .eq("id", app.job_id)
    .single();
  if (!job || job.employer_id !== user.id) {
    return { ok: false, error: "Not authorized." };
  }

  const { data: userData } = await admin.auth.admin.getUserById(
    app.applicant_id,
  );
  const email = userData?.user?.email;
  if (!email) return { ok: false, error: "Applicant email not found." };

  let delivered: boolean;
  try {
    delivered = await sendEmail({
      to: email,
      subject: subject.trim(),
      html: composeEmailHtml(body.trim()),
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not send the email.",
    };
  }

  await admin.from("application_emails").insert({
    application_id: applicationId,
    kind,
    subject: subject.trim(),
    body: body.trim(),
    sent_by: user.id,
  });

  revalidatePath(`/jobs/${jobId}/applicants/${applicationId}`);
  return { ok: true, delivered };
}
