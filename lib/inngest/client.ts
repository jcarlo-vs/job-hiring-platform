import { Inngest, eventType, staticSchema } from "inngest";

/**
 * Inngest client for background jobs.
 *
 * The SDK auto-detects dev mode from the INNGEST_DEV env var (set to 1 in local
 * .env.local), routing sends to the local Inngest dev server. In production the
 * Inngest Vercel integration injects INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY,
 * and request signing secures the serve endpoint against outside callers.
 */
export const inngest = new Inngest({ id: "job-hiring-platform" });

/**
 * Fired by the apply flow once an application row exists and its resume has been
 * snapshotted. Carries only the application id; the screening worker loads
 * everything else from the database. Used both to send the event and as the
 * worker's trigger (which types `event.data` in the handler).
 */
export const applicationSubmitted = eventType("application/submitted", {
  schema: staticSchema<{ applicationId: string }>(),
});

/**
 * Fired when an employer moves a candidate to a new stage (via
 * updateApplicationStage). Drives the applicant stage-change email. Not fired
 * for the worker's automatic APPLIED -> SCREENED transition, which is not a
 * human decision and writes the stage directly.
 */
export const applicationStageChanged = eventType("application/stage-changed", {
  schema: staticSchema<{ applicationId: string; stage: string }>(),
});
