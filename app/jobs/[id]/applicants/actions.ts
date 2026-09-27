"use server";

import { revalidatePath } from "next/cache";

import { PIPELINE_STAGES, type ApplicationStage } from "@/lib/applications";
import { getUser } from "@/lib/auth";
import { getEmailBySub } from "@/lib/cognito";
import { asAdmin, asUser } from "@/lib/db";
import { composeEmailHtml, sendEmail } from "@/lib/email";

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

  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const updated = await asUser((db) =>
    db.query<{ id: string }>(
      `update public.applications set stage = $2::public.application_stage
        where id = $1
        returning id`,
      [applicationId, stage],
    ),
  );
  if (updated.length === 0) {
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

  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  // Ownership checked here in application code, because the read and the log
  // write both go over the admin connection, which bypasses RLS.
  const app = await asAdmin((db) =>
    db.one<{ applicant_id: string }>(
      `select a.applicant_id
         from public.applications a
         join public.jobs j on j.id = a.job_id
        where a.id = $1 and j.employer_id = $2`,
      [applicationId, user.sub],
    ),
  );
  if (!app) return { ok: false, error: "Not authorized." };

  // The address lives with Cognito, not in profiles.
  const email = await getEmailBySub(app.applicant_id);
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

  await asAdmin((db) =>
    db.query(
      `insert into public.application_emails
         (application_id, kind, subject, body, sent_by)
       values ($1, $2, $3, $4, $5)`,
      [applicationId, kind, subject.trim(), body.trim(), user.sub],
    ),
  );

  revalidatePath(`/jobs/${jobId}/applicants/${applicationId}`);
  return { ok: true, delivered };
}
