import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";

/**
 * Secret loading for the Lambda workers.
 *
 * Setting these as Lambda environment variables through Terraform would write
 * them in plaintext into terraform.tfstate, so they live in SSM Parameter Store
 * (standard tier, free) and are fetched at cold start instead.
 *
 * The values are put onto process.env because the shared lib/ modules
 * (supabase/admin, screening, email) read process.env directly. That keeps those
 * files identical between Next.js and Lambda, with no injection plumbing.
 */

const PREFIX = process.env.SSM_PREFIX ?? "/talentscreen";

/** Without these the worker cannot do anything useful, so a miss is fatal. */
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/**
 * These degrade gracefully by design: screening surfaces an ERROR without an
 * Anthropic key, email no-ops without a Resend key, and email links fall back to
 * a default site URL. A miss must not crash the worker.
 */
const OPTIONAL = [
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "NEXT_PUBLIC_SITE_URL",
] as const;

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

    // Fail loudly at cold start rather than with a confusing Supabase error on
    // the first message. Optional keys are left alone so the graceful-degradation
    // paths in lib/email.ts and the screening worker still work.
    const missing = REQUIRED.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(`Missing required SSM parameters: ${missing.join(", ")}`);
    }
  })();

  return loaded;
}
