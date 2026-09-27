import {
  SendMessageBatchCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

import { awsCredentials } from "@/lib/aws-credentials";

// SERVER ONLY. Publishes background work to SQS. Replaces lib/inngest/client.ts.
//
// Two queues, not one topic fanning out to both consumers. The apply path
// enqueues to both; re-screening and a job-requirements edit enqueue to screening
// only. That split is the point: under Inngest both workers shared a single
// `application/submitted` event, so every re-screen re-sent the "we received your
// application" email, and editing a job's requirements re-sent it to every
// applicant at once. Routing it at the producer means there is no guard to forget.
//
// Enforced by scripts/check-queue-routing.ts (npm run check:queue).

const SCREENING_QUEUE_URL = process.env.SCREENING_QUEUE_URL;
const EMAIL_QUEUE_URL = process.env.EMAIL_QUEUE_URL;

/** SQS caps a SendMessageBatch at 10 entries. */
const BATCH_MAX = 10;

/**
 * ponytail: local dev invokes the worker handler in-process instead of standing
 * up a queue, so `npm run dev` is one command again instead of the two Inngest
 * needed. This skips real queue semantics (no redelivery, no DLQ, no concurrency
 * cap, and it runs inline so the action waits for it). Reach for LocalStack only
 * if a bug ever turns out to need genuine SQS behaviour to reproduce.
 */
const LOCAL = process.env.QUEUE_LOCAL === "1";

let client: SQSClient | null = null;

function sqs(): SQSClient {
  client ??= new SQSClient({
    region: process.env.SQS_REGION ?? "us-east-1",
    credentials: awsCredentials(),
  });
  return client;
}

/** Shape one message the way the workers parse it. */
function body(applicationId: string): string {
  return JSON.stringify({ applicationId });
}

/** Minimal stand-in for the SQS event shape the handlers expect locally. */
function localEvent(applicationId: string) {
  return {
    Records: [
      {
        messageId: `local-${applicationId}`,
        receiptHandle: "local",
        body: body(applicationId),
        attributes: {},
        messageAttributes: {},
        md5OfBody: "",
        eventSource: "aws:sqs",
        eventSourceARN: "local",
        awsRegion: process.env.SQS_REGION ?? "us-east-1",
      },
    ],
  };
}

async function sendOne(
  queueUrl: string | undefined,
  name: string,
  applicationId: string,
): Promise<void> {
  if (!queueUrl) {
    throw new Error(`${name} queue URL is not configured.`);
  }
  await sqs().send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: body(applicationId),
    }),
  );
}

/** Enqueue AI screening. Used by apply, employer re-screen, and bulk re-screen. */
export async function enqueueScreening(applicationId: string): Promise<void> {
  if (LOCAL) {
    const { handler } = await import("@/workers/screening");
    await handler(localEvent(applicationId) as Parameters<typeof handler>[0]);
    return;
  }
  await sendOne(SCREENING_QUEUE_URL, "Screening", applicationId);
}

/**
 * Enqueue the applicant's confirmation email. Apply only. Deliberately not
 * called from any re-screen path.
 */
export async function enqueueApplicationReceived(
  applicationId: string,
): Promise<void> {
  if (LOCAL) {
    const { handler } = await import("@/workers/application-received-email");
    await handler(localEvent(applicationId) as Parameters<typeof handler>[0]);
    return;
  }
  await sendOne(EMAIL_QUEUE_URL, "Email", applicationId);
}

/**
 * Bulk re-screen, for when a job's requirements change and every existing score
 * is stale. Batched because a popular job can have dozens of applicants.
 */
export async function enqueueScreeningBatch(
  applicationIds: string[],
): Promise<void> {
  if (applicationIds.length === 0) return;

  if (LOCAL) {
    for (const id of applicationIds) await enqueueScreening(id);
    return;
  }
  if (!SCREENING_QUEUE_URL) {
    throw new Error("Screening queue URL is not configured.");
  }

  for (let i = 0; i < applicationIds.length; i += BATCH_MAX) {
    const chunk = applicationIds.slice(i, i + BATCH_MAX);
    await sqs().send(
      new SendMessageBatchCommand({
        QueueUrl: SCREENING_QUEUE_URL,
        Entries: chunk.map((applicationId, n) => ({
          Id: String(i + n),
          MessageBody: body(applicationId),
        })),
      }),
    );
  }
}
