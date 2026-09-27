import assert from "node:assert/strict";

import { SQSClient } from "@aws-sdk/client-sqs";

/**
 * Checks which queue each producer path writes to.
 *
 * This exists for one reason: under Inngest, screening and the confirmation
 * email shared a single `application/submitted` event, so an employer clicking
 * re-screen emailed the candidate "We received your application" a second time,
 * and editing a job's requirements did it to every applicant at once. The
 * two-queue split fixes that structurally, and this check keeps it fixed.
 *
 * Run with: npm run check:queue
 */

const SCREENING = "https://sqs.test/screening";
const EMAIL = "https://sqs.test/email";

/** Queue URLs captured from intercepted sends, in order, one per message. */
const sent: string[] = [];

function summarize(urls: string[]): string {
  const screening = urls.filter((u) => u === SCREENING).length;
  const email = urls.filter((u) => u === EMAIL).length;
  return `screening x${screening}, email x${email}`;
}

async function check(
  name: string,
  run: () => Promise<void>,
  expected: string[],
): Promise<boolean> {
  sent.length = 0;
  try {
    await run();
    assert.deepEqual(sent, expected);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    if (err instanceof assert.AssertionError) {
      console.error(`      expected: ${summarize(expected)}`);
      console.error(`      actual:   ${summarize(sent)}`);
    } else {
      console.error(`      threw: ${err instanceof Error ? err.message : err}`);
    }
    return false;
  }
  console.log(`PASS  ${name} -> ${summarize(expected)}`);
  return true;
}

async function main() {
  // Set before lib/queue.ts is imported: it reads these at module scope.
  process.env.SCREENING_QUEUE_URL = SCREENING;
  process.env.EMAIL_QUEUE_URL = EMAIL;
  delete process.env.QUEUE_LOCAL;

  // Intercept at the prototype so lib/queue.ts's own lazily created client is
  // captured. A batch of N entries records as N sends.
  SQSClient.prototype.send = (async (command: {
    input: { QueueUrl?: string; Entries?: unknown[] };
  }) => {
    const count = command.input.Entries?.length ?? 1;
    for (let i = 0; i < count; i++) sent.push(command.input.QueueUrl!);
    return {};
  }) as unknown as typeof SQSClient.prototype.send;

  const queue = await import("../lib/queue");

  const results = [
    // Apply is the only path that may send the confirmation email.
    await check(
      "apply",
      async () => {
        await queue.enqueueScreening("app-1");
        await queue.enqueueApplicationReceived("app-1");
      },
      [SCREENING, EMAIL],
    ),

    // The bug fix: neither re-enqueue path may touch the email queue.
    await check(
      "employer re-screen",
      () => queue.enqueueScreening("app-1"),
      [SCREENING],
    ),

    await check(
      "requirements changed, 12 applicants",
      () =>
        queue.enqueueScreeningBatch(
          Array.from({ length: 12 }, (_, i) => `app-${i}`),
        ),
      Array<string>(12).fill(SCREENING),
    ),

    // An empty bulk re-screen must not send an empty batch; SQS rejects that.
    await check(
      "requirements changed, no applicants",
      () => queue.enqueueScreeningBatch([]),
      [],
    ),
  ];

  if (results.includes(false)) {
    console.error("\nQueue routing check FAILED");
    process.exit(1);
  }

  console.log("\nQueue routing OK: only the apply path reaches the email queue.");
}

main();
