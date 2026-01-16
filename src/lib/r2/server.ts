import { S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID ?? "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
const endpoint =
  process.env.R2_ENDPOINT ??
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

const defaultBucket = process.env.R2_BUCKET_NAME ?? "ia-four-sales-crm";

export const r2Buckets = {
  inboxAttachments: process.env.R2_BUCKET_INBOX_ATTACHMENTS ?? defaultBucket,
  contactFiles: process.env.R2_BUCKET_CONTACT_FILES ?? defaultBucket,
  contactAvatars: process.env.R2_BUCKET_CONTACT_AVATARS ?? defaultBucket,
  userAvatars: process.env.R2_BUCKET_USER_AVATARS ?? defaultBucket,
  agentKnowledge: process.env.R2_BUCKET_AGENT_KNOWLEDGE ?? defaultBucket,
};

type BucketInfo = {
  bucket: string;
  prefix: string;
};

const bucketAliases: Record<string, BucketInfo> = {
  "inbox-attachments": {
    bucket: r2Buckets.inboxAttachments,
    prefix: "inbox-attachments",
  },
  "contact-files": { bucket: r2Buckets.contactFiles, prefix: "contact-files" },
  "contact-avatars": {
    bucket: r2Buckets.contactAvatars,
    prefix: "contact-avatars",
  },
  "user-avatars": { bucket: r2Buckets.userAvatars, prefix: "user-avatars" },
  "agent-knowledge": {
    bucket: r2Buckets.agentKnowledge,
    prefix: "agent-knowledge",
  },
};

export function resolveBucketInfo(alias: string) {
  return bucketAliases[alias] ?? null;
}

export function resolveBucket(alias: string) {
  return resolveBucketInfo(alias)?.bucket ?? null;
}

export function isBucketAllowed(alias: string) {
  return Boolean(resolveBucket(alias));
}

export function buildR2Key(alias: string, key: string) {
  const info = resolveBucketInfo(alias);
  if (!info) return key;
  const cleanKey = key.replace(/^\/+/, "");
  const prefix = info.prefix;
  if (cleanKey.startsWith(`${prefix}/`)) {
    return cleanKey;
  }
  return `${prefix}/${cleanKey}`;
}

export function stripR2Prefix(alias: string, key: string) {
  const info = resolveBucketInfo(alias);
  if (!info) return key;
  const cleanKey = key.replace(/^\/+/, "");
  const prefix = `${info.prefix}/`;
  return cleanKey.startsWith(prefix) ? cleanKey.slice(prefix.length) : cleanKey;
}

export function getR2Client() {
  if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error("Missing R2 env vars.");
  }
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}
