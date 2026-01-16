const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID ?? "";
const baseTemplate = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "";
const defaultBucket =
  process.env.NEXT_PUBLIC_R2_BUCKET_NAME ?? "ia-four-sales-crm";

const prefixes: Record<string, string> = {
  "inbox-attachments": "inbox-attachments",
  "contact-files": "contact-files",
  "contact-avatars": "contact-avatars",
  "user-avatars": "user-avatars",
  "agent-knowledge": "agent-knowledge",
};

export function buildR2PublicUrl(bucket: string, key: string) {
  const cleanKey = key.replace(/^\/+/, "");
  const bucketName = defaultBucket || bucket;
  const prefix = prefixes[bucket] ?? bucket;
  const finalKey = cleanKey.startsWith(`${prefix}/`)
    ? cleanKey
    : `${prefix}/${cleanKey}`;
  if (baseTemplate) {
    const base = baseTemplate
      .replace("{bucket}", bucketName)
      .replace("{accountId}", accountId)
      .replace(/\/+$/, "");
    return `${base}/${finalKey}`;
  }
  if (!accountId) return null;
  return `https://${bucketName}.${accountId}.r2.dev/${finalKey}`;
}
