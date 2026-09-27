import type { SQSBatchResponse, SQSEvent } from "aws-lambda";

import { getEmailBySub } from "@/lib/cognito";
import { asAdmin } from "@/lib/db";
import { applicationReceivedEmail, sendEmail } from "@/lib/email";

import { loadSecrets } from "./config";

/** Unfixable input (application or email address gone). No retry. */
class PermanentError extends Error {}

/**
 * Applicant confirmation email. Triggered by a message on the email queue.
 *
 * Only the apply path enqueues here. Re-screening and a job-requirements edit
 * write to the screening queue alone, which is what stops this from firing again
 * on a re-screen. Under Inngest both workers shared one `application/submitted`
 * event, so every re-screen re-sent this email and editing a job's requirements
 * re-sent it to every applicant at once.
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  await loadSecrets();

  const batchItemFailures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    let applicationId = "unknown";
    try {
      applicationId = (JSON.parse(record.body) as { applicationId: string })
        .applicationId;
      await sendOne(applicationId);
    } catch (err) {
      if (err instanceof PermanentError) {
        console.error(`[apply-email] ${applicationId} permanent: ${err.message}`);
      } else {
        console.error(`[apply-email] ${applicationId} transient:`, err);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
  }

  return { batchItemFailures };
}

async function sendOne(applicationId: string): Promise<void> {
  const row = await asAdmin((db) =>
    db.one<{
      applicant_id: string;
      full_name: string | null;
      title: string;
    }>(
      `select a.applicant_id, p.full_name, j.title
         from public.applications a
         join public.jobs j on j.id = a.job_id
         join public.profiles p on p.id = a.applicant_id
        where a.id = $1`,
      [applicationId],
    ),
  );
  if (!row) {
    throw new PermanentError(`Application ${applicationId} not found.`);
  }

  // The address lives with Cognito, not in profiles.
  const email = await getEmailBySub(row.applicant_id);
  if (!email) throw new PermanentError("Applicant email not found.");

  const { subject, html } = applicationReceivedEmail({
    name: row.full_name,
    jobTitle: row.title,
  });

  const sent = await sendEmail({ to: email, subject, html });
  console.log(`[apply-email] ${applicationId} to ${email} sent=${sent}`);
}
