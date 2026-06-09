import { NonRetriableError } from "inngest";

import { applicationSubmitted, inngest } from "@/lib/inngest/client";
import { extractResumeText } from "@/lib/resume-extract";
import { screenResume } from "@/lib/screening";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * AI resume screening worker. Triggered by `application/submitted`.
 *
 * Steps (each independently retried and memoized by Inngest):
 *  1. claim         - atomically move PENDING|ERROR -> PROCESSING. This is the
 *                     idempotency guard: a duplicate or concurrent run finds
 *                     nothing to claim and exits, so re-runs never double-write.
 *  2. load          - read the application + its job's requirements.
 *  3. extract-resume- download the snapshotted resume and pull out its text.
 *  4. screen        - call Claude for the structured assessment.
 *  5. persist       - write results, set DONE, advance APPLIED -> SCREENED.
 *
 * Retries (3) cover transient failures (rate limits, blips). A NonRetriableError
 * short-circuits on unfixable input (no resume, scanned image). Either way, once
 * retries are exhausted `onFailure` marks the row ERROR so the UI can show it.
 *
 * Advisory only: this never rejects a candidate - it scores and moves them to
 * SCREENED for a human to decide (DECISIONS.md, human-in-the-loop principle).
 */
export const screenApplication = inngest.createFunction(
  {
    id: "screen-application",
    triggers: [{ event: applicationSubmitted }],
    retries: 3,
    concurrency: { limit: 5 },
    onFailure: async ({ event, error }) => {
      const applicationId = event.data.event.data.applicationId;
      const admin = createAdminClient();
      await admin
        .from("applications")
        .update({ screening_status: "ERROR" })
        .eq("id", applicationId);
      console.error(`[screening] ${applicationId} failed: ${error.message}`);
    },
  },
  async ({ event, step }) => {
    const { applicationId } = event.data;

    // 1. Claim. The conditional update is atomic in Postgres, so it doubles as
    //    the "don't double-process" guard even if the event fires twice.
    const claimed = await step.run("claim", async () => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("applications")
        .update({ screening_status: "PROCESSING" })
        .eq("id", applicationId)
        .in("screening_status", ["PENDING", "ERROR"])
        .select("id");
      if (error) throw new Error(`Claim failed: ${error.message}`);
      return (data?.length ?? 0) > 0;
    });

    if (!claimed) {
      return { skipped: true, reason: "already processing or done" };
    }

    // 2. Load the application and its job (two PK lookups - avoids embed typing).
    const context = await step.run("load", async () => {
      const admin = createAdminClient();
      const { data: app, error: appError } = await admin
        .from("applications")
        .select("resume_path, stage, job_id")
        .eq("id", applicationId)
        .single();
      if (appError || !app) {
        throw new NonRetriableError(`Application ${applicationId} not found.`);
      }
      if (!app.resume_path) {
        throw new NonRetriableError(`Application ${applicationId} has no resume.`);
      }

      const { data: job, error: jobError } = await admin
        .from("jobs")
        .select("title, description, requirements")
        .eq("id", app.job_id)
        .single();
      if (jobError || !job) {
        throw new NonRetriableError(`Job ${app.job_id} not found.`);
      }

      return { resumePath: app.resume_path, stage: app.stage, job };
    });

    // 3. Extract resume text. A bad/empty/scanned file will not improve on retry.
    const resumeText = await step.run("extract-resume", async () => {
      try {
        return await extractResumeText(context.resumePath);
      } catch (err) {
        throw new NonRetriableError(
          err instanceof Error ? err.message : "Resume extraction failed.",
        );
      }
    });

    // 4. Screen with Claude (structured output).
    const result = await step.run("screen", async () =>
      screenResume({
        jobTitle: context.job.title,
        jobDescription: context.job.description,
        requirements: context.job.requirements,
        resumeText,
      }),
    );

    // 5. Persist. Advance APPLIED -> SCREENED only; never pull a candidate back
    //    from a stage the employer has already moved them to (e.g. on re-screen).
    await step.run("persist", async () => {
      const admin = createAdminClient();
      const { error } = await admin
        .from("applications")
        .update({
          ai_score: result.score,
          ai_recommendation: result.recommendation,
          ai_summary: result.summary,
          ai_matched: result.matched,
          ai_missing: result.missing,
          ai_flags: result.flags,
          screening_status: "DONE",
          stage: context.stage === "APPLIED" ? "SCREENED" : context.stage,
        })
        .eq("id", applicationId);
      if (error) throw new Error(`Persist failed: ${error.message}`);
    });

    return {
      applicationId,
      score: result.score,
      recommendation: result.recommendation,
    };
  },
);
