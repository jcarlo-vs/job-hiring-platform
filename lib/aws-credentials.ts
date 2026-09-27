import type { AwsCredentialIdentity } from "@aws-sdk/types";

/**
 * SERVER ONLY. Which credentials an AWS SDK client should use.
 *
 * On Vercel the credentials must be passed explicitly from SQS_-prefixed vars.
 * Vercel Functions run on AWS Lambda, which reserves AWS_ACCESS_KEY_ID,
 * AWS_SECRET_ACCESS_KEY and AWS_REGION for its own execution role and sets them
 * at runtime, so anything stored under those names is silently clobbered.
 *
 * Everywhere else - a developer's machine with an AWS profile, and our own
 * Lambda workers, where the runtime values ARE the right role - returning
 * undefined lets the SDK use its default credential chain, which is what we
 * want.
 */
export function awsCredentials(): AwsCredentialIdentity | undefined {
  const accessKeyId = process.env.SQS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SQS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return undefined;
  return { accessKeyId, secretAccessKey };
}
