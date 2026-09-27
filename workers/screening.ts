import type { SQSBatchResponse, SQSEvent } from "aws-lambda";

import { asAdmin } from "@/lib/db";
import { extractResumeText } from "@/lib/resume-extract";
import { screenResume } from "@/lib/screening";

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
  const markError = () =>
    asAdmin((db) =>
      db.query(
        `update public.applications set screening_status = 'ERROR' where id = $1`,
        [applicationId],
      ),
    );

  // 1. Claim. The conditional update is atomic in Postgres, so it doubles as the
  //    "don't double-process" guard even if the message is delivered twice.
  const claimed = await asAdmin((db) =>
    db.query<{ id: string }>(
      `update public.applications
          set screening_status = 'PROCESSING'
        where id = $1
          and screening_status in ('PENDING', 'ERROR')
        returning id`,
      [applicationId],
    ),
  );
  if (claimed.length === 0) {
    console.log(`[screening] ${applicationId} already processing or done`);
    return;
  }

  // 2. Load the application and its job in one go.
  const context = await asAdmin((db) =>
    db.one<{
      resume_path: string | null;
      stage: string;
      title: string;
      description: string;
      requirements: string;
    }>(
      `select a.resume_path, a.stage, j.title, j.description, j.requirements
         from public.applications a
         join public.jobs j on j.id = a.job_id
        where a.id = $1`,
      [applicationId],
    ),
  );
  if (!context) {
    await markError();
    throw new PermanentError(`Application ${applicationId} not found.`);
  }
  if (!context.resume_path) {
    await markError();
    throw new PermanentError(`Application ${applicationId} has no resume.`);
  }

  // 3. Extract resume text. A bad, empty or scanned file will not improve on a
  //    retry, so this is permanent.
  let resumeText: string;
  try {
    resumeText = await extractResumeText(context.resume_path);
  } catch (err) {
    await markError();
    throw new PermanentError(
      err instanceof Error ? err.message : "Resume extraction failed.",
    );
  }

  // 4. Screen with the AI (structured output).
  const result = await screenResume({
    jobTitle: context.title,
    jobDescription: context.description,
    requirements: context.requirements,
    resumeText,
  });

  // 5. Persist. Advance APPLIED -> SCREENED only; never pull a candidate back
  //    from a stage the employer has already moved them to (e.g. on re-screen).
  await asAdmin((db) =>
    db.query(
      `update public.applications
          set ai_score = $2,
              ai_recommendation = $3::public.ai_recommendation,
              ai_summary = $4,
              ai_matched = $5::jsonb,
              ai_missing = $6::jsonb,
              ai_flags = $7::jsonb,
              screening_status = 'DONE',
              stage = case when stage = 'APPLIED' then 'SCREENED'::public.application_stage
                           else stage end
        where id = $1`,
      [
        applicationId,
        result.score,
        result.recommendation,
        result.summary,
        JSON.stringify(result.matched),
        JSON.stringify(result.missing),
        JSON.stringify(result.flags),
      ],
    ),
  );

  console.log(
    `[screening] ${applicationId} scored ${result.score} ${result.recommendation}`,
  );
}
