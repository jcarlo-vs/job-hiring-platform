import { NonRetriableError } from "inngest";

import { applicationReceivedEmail, sendEmail } from "@/lib/email";
import { applicationSubmitted, inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";

/** Load the bits the applicant email needs: their address, name, job title. */
async function loadRecipient(applicationId: string) {
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select("applicant_id, job_id")
    .eq("id", applicationId)
    .single();
  if (!app) throw new NonRetriableError(`Application ${applicationId} not found.`);

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
  if (!email) throw new NonRetriableError("Applicant email not found.");

  return {
    email,
    name: profile?.full_name ?? null,
    jobTitle: job?.title ?? "the role",
  };
}

/**
 * Applicant confirmation, on apply. Shares the application/submitted trigger
 * with screening. Stage-change emails are now composed and sent by the hiring
 * manager from the candidate page (see sendCandidateEmail), not auto-fired.
 */
export const sendApplicationReceived = inngest.createFunction(
  {
    id: "send-application-received",
    triggers: [{ event: applicationSubmitted }],
    retries: 2,
  },
  async ({ event }) => {
    const { email, name, jobTitle } = await loadRecipient(
      event.data.applicationId,
    );
    const { subject, html } = applicationReceivedEmail({ name, jobTitle });
    const sent = await sendEmail({ to: email, subject, html });
    return { sent, to: email };
  },
);
