import {
  CopyObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import { awsCredentials } from "@/lib/aws-credentials";
import { RESUME_CONTENT_TYPES, RESUME_MAX_BYTES } from "@/lib/resume";

/**
 * SERVER ONLY. Resume storage on S3. Replaces Supabase Storage.
 *
 * The bucket is private with public access fully blocked, so nothing here ever
 * returns a durable public link: uploads go through a short-lived presigned
 * POST, and reads are either streamed by the app or handed out as a presigned
 * GET that expires in minutes.
 */

const BUCKET = process.env.RESUME_BUCKET;

let client: S3Client | null = null;

function s3(): S3Client {
  client ??= new S3Client({
    region: process.env.SQS_REGION ?? "ap-southeast-1",
    credentials: awsCredentials(),
  });
  return client;
}

function bucket(): string {
  if (!BUCKET) throw new Error("RESUME_BUCKET is not set.");
  return BUCKET;
}

/**
 * Mint a presigned POST for a browser upload.
 *
 * POST rather than PUT on purpose. DECISIONS.md records that the Supabase
 * bucket's own allowedMimeTypes and fileSizeLimit were the authoritative
 * validation, not the client. A presigned PUT cannot enforce a size limit at
 * all; a POST policy can, via content-length-range. Dropping to PUT would
 * silently remove a guarantee the original design relied on, and a client could
 * then upload a 2 GB file to a path we signed.
 */
export async function createResumeUpload(
  key: string,
  contentType: string,
): Promise<{ url: string; fields: Record<string, string> }> {
  if (!Object.values(RESUME_CONTENT_TYPES).includes(contentType)) {
    throw new Error(`Refusing to sign an upload for ${contentType}.`);
  }

  const { url, fields } = await createPresignedPost(s3(), {
    Bucket: bucket(),
    Key: key,
    Conditions: [
      ["content-length-range", 1, RESUME_MAX_BYTES],
      ["eq", "$Content-Type", contentType],
    ],
    Fields: { "Content-Type": contentType },
    Expires: 300,
  });

  return { url, fields };
}

/**
 * Snapshot the applicant's profile resume onto the application's own path, so
 * a later CV replacement does not rewrite history. Server-side copy: the bytes
 * never travel through us.
 */
export async function copyResume(from: string, to: string): Promise<void> {
  await s3().send(
    new CopyObjectCommand({
      Bucket: bucket(),
      CopySource: `${bucket()}/${from}`,
      Key: to,
    }),
  );
}

/** Download the object's bytes. Used by the screening worker and the viewer. */
export async function getResumeBytes(key: string): Promise<Buffer> {
  const res = await s3().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  if (!res.Body) throw new Error(`No body for ${key}`);
  return Buffer.from(await res.Body.transformToByteArray());
}

/** Short-lived read link, for the applicant checking their own uploaded CV. */
export async function getResumeUrl(key: string, seconds = 300): Promise<string> {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: seconds },
  );
}
