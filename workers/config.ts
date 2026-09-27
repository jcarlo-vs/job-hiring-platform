import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";

/**
 * Secret loading for the Lambda workers.
 *
 * Setting these as Lambda environment variables through Terraform would write
 * them in plaintext into terraform.tfstate, so they live in SSM Parameter Store
 * (standard tier, free) and are fetched at cold start instead.
 *
 * The values are put onto process.env because the shared lib/ modules read
 * process.env directly. That keeps those files identical between Next.js and
 * Lambda, with no injection plumbing.
 *
 * Non-secrets (the bucket name, the Cognito pool id, the site URL) are plain
 * Lambda environment variables set by Terraform; only actual secrets are here.
 */

const PREFIX = process.env.SSM_PREFIX ?? "/talentscreen";

/** Without this the worker cannot reach the database at all. */
const REQUIRED = ["DATABASE_URL"] as const;

/**
 * These degrade gracefully by design: screening surfaces an ERROR without an
 * Anthropic key, and email no-ops without a Resend key. A miss must not crash
 * the worker.
 */
const OPTIONAL = ["ANTHROPIC_API_KEY", "RESEND_API_KEY", "RESEND_FROM"] as const;

let loaded: Promise<void> | null = null;

/**
 * Fetch the worker secrets once per container and cache them for its lifetime:
 * one GetParameters call per cold start, not one per message.
 *
 * No-ops under QUEUE_LOCAL, where the handler runs inside `next dev` and
 * .env.local has already populated process.env.
 */
export function loadSecrets(): Promise<void> {
  loaded ??= (async () => {
    if (process.env.QUEUE_LOCAL === "1") return;

    const ssm = new SSMClient({});
    const res = await ssm.send(
      new GetParametersCommand({
        Names: [...REQUIRED, ...OPTIONAL].map((k) => `${PREFIX}/${k}`),
        WithDecryption: true,
      }),
    );

    for (const p of res.Parameters ?? []) {
      const key = p.Name?.split("/").pop();
      if (key && p.Value) process.env[key] = p.Value;
    }

    // Fail loudly at cold start rather than with a confusing connection error
    // on the first message.
    const missing = REQUIRED.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(`Missing required SSM parameters: ${missing.join(", ")}`);
    }
  })();

  return loaded;
}
