import type { SQSBatchResponse, SQSEvent } from "aws-lambda";

import { extractResumeText } from "@/lib/resume-extract";
import { screenResume } from "@/lib/screening";
import { createAdminClient } from "@/lib/supabase/admin";

import { loadSecrets } from "./config";

/**
 * Thrown for input that will never succeed however many times it is retried:
 * a missing application, no resume, a scanned image. The row is marked ERROR and
 * the message is deleted rather than redelivered.
 */
class PermanentError extends Error {}

/**
 * AI resume screening worker. Triggered by a message on the screening queue.
 *
 * Steps: claim, load, extract, screen, persist.
 *
 * SQS standard queues deliver at least once, so a duplicate is expected rather
 * than exceptional. The first thing this does is an atomic
 * `PENDING | ERROR -> PROCESSING` claim; a redelivery claims nothing and returns.
 * That guard is also why re-running the whole handler on retry is safe: unlike
 * Inngest there is no per-step memoization here, so a retry starts from the top.
 *
 * Advisory only: this never rejects a candidate. It scores and moves them to
 * SCREENED for a person to decide (DECISIONS.md, human-in-the-loop).
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  await loadSecrets();

  const batchItemFailures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    let applicationId = "unknown";
    try {
      applicationId = (JSON.parse(record.body) as { applicationId: string })
        .applicationId;
      await screenOne(applicationId);
    } catch (err) {
      if (err instanceof PermanentError) {
        // Row already marked ERROR. Return normally so SQS deletes the message:
        // a retry cannot fix bad input, and burning 3 attempts on it is waste.
        console.error(`[screening] ${applicationId} permanent: ${err.message}`);
      } else {
        // Transient (rate limit, network, blip). Report it so SQS redelivers;
        // maxReceiveCount then routes it to the DLQ.
        console.error(`[screening] ${applicationId} transient:`, err);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
  }

  return { batchItemFailures };
}

async function screenOne(applicationId: string): Promise<void> {
  const admin = createAdminClient();

  const markError = async () => {
    await admin
      .from("applications")
      .update({ screening_status: "ERROR" })
      .eq("id", applicationId);
  };

  // 1. Claim. The conditional update is atomic in Postgres, so it doubles as the
  //    "don't double-process" guard even if the message is delivered twice.
  const { data: claimed, error: claimError } = await admin
    .from("applications")
    .update({ screening_status: "PROCESSING" })
    .eq("id", applicationId)
    .in("screening_status", ["PENDING", "ERROR"])
    .select("id");
  if (claimError) throw new Error(`Claim failed: ${claimError.message}`);
  if ((claimed?.length ?? 0) === 0) {
    console.log(`[screening] ${applicationId} already processing or done`);
    return;
  }

  // 2. Load the application and its job (two PK lookups, avoids embed typing).
  const { data: app, error: appError } = await admin
    .from("applications")
    .select("resume_path, stage, job_id")
    .eq("id", applicationId)
    .single();
  if (appError || !app) {
    await markError();
    throw new PermanentError(`Application ${applicationId} not found.`);
  }
  if (!app.resume_path) {
    await markError();
    throw new PermanentError(`Application ${applicationId} has no resume.`);
  }

  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select("title, description, requirements")
    .eq("id", app.job_id)
    .single();
  if (jobError || !job) {
    await markError();
    throw new PermanentError(`Job ${app.job_id} not found.`);
  }

  // 3. Extract resume text. A bad, empty or scanned file will not improve on a
  //    retry, so this is permanent.
  let resumeText: string;
  try {
    resumeText = await extractResumeText(app.resume_path);
  } catch (err) {
    await markError();
    throw new PermanentError(
      err instanceof Error ? err.message : "Resume extraction failed.",
    );
  }

  // 4. Screen with the AI (structured output).
  const result = await screenResume({
    jobTitle: job.title,
    jobDescription: job.description,
    requirements: job.requirements,
    resumeText,
  });

  // 5. Persist. Advance APPLIED -> SCREENED only; never pull a candidate back
  //    from a stage the employer has already moved them to (e.g. on re-screen).
  const { error: persistError } = await admin
    .from("applications")
    .update({
      ai_score: result.score,
      ai_recommendation: result.recommendation,
      ai_summary: result.summary,
      ai_matched: result.matched,
      ai_missing: result.missing,
      ai_flags: result.flags,
      screening_status: "DONE",
      stage: app.stage === "APPLIED" ? "SCREENED" : app.stage,
    })
    .eq("id", applicationId);
  if (persistError) throw new Error(`Persist failed: ${persistError.message}`);

  console.log(
    `[screening] ${applicationId} scored ${result.score} ${result.recommendation}`,
  );
}
