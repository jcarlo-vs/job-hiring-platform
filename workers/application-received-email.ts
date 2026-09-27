import type { SQSBatchResponse, SQSEvent } from "aws-lambda";

import { applicationReceivedEmail, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const admin = createAdminClient();

  const { data: app } = await admin
    .from("applications")
    .select("applicant_id, job_id")
    .eq("id", applicationId)
    .single();
  if (!app) {
    throw new PermanentError(`Application ${applicationId} not found.`);
  }

  // The address lives in auth.users, not profiles, so it comes from the admin
  // auth API rather than a table read.
  const [{ data: job }, { data: userData }, { data: profile }] =
    await Promise.all([
      admin.from("jobs").select("title").eq("id", app.job_id).single(),
      admin.auth.admin.getUserById(app.applicant_id),
      admin
        .from("profiles")
        .select("full_name")
        .eq("id", app.applicant_id)
        .single(),
    ]);

  const email = userData?.user?.email;
  if (!email) throw new PermanentError("Applicant email not found.");

  const { subject, html } = applicationReceivedEmail({
    name: profile?.full_name ?? null,
    jobTitle: job?.title ?? "the role",
  });

  const sent = await sendEmail({ to: email, subject, html });
  console.log(`[apply-email] ${applicationId} to ${email} sent=${sent}`);
}
