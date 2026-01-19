
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

// 1. Load Environment Variables manually
const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex === -1) return;
        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, ''); // Remove quotes
        process.env[key] = value;
    });
    console.log("Loaded .env file");
} else {
    console.warn("No .env file found at", envPath);
}

// 2. Client Configuration
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
    console.error("Missing R2 credentials in .env");
    console.error({ accountId, accessKeyId: !!accessKeyId, secretAccessKey: !!secretAccessKey, endpoint });
    process.exit(1);
}

const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

// 3. Resolve Buckets
const defaultBucket = process.env.R2_BUCKET_NAME || "ia-four-sales-crm";
const buckets = [
    process.env.R2_BUCKET_INBOX_ATTACHMENTS || defaultBucket,
    process.env.R2_BUCKET_CONTACT_FILES || defaultBucket,
    process.env.R2_BUCKET_CONTACT_AVATARS || defaultBucket,
    process.env.R2_BUCKET_USER_AVATARS || defaultBucket,
    process.env.R2_BUCKET_AGENT_KNOWLEDGE || defaultBucket,
];
// Remove duplicates
const uniqueBuckets = [...new Set(buckets)];

// 4. Define CORS Policy
const corsPolicy = {
    CORSRules: [
        {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"], // Allow localhost and production
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
        },
    ],
};

// 5. Apply Policy
async function run() {
    console.log("Applying CORS policy to buckets:", uniqueBuckets);

    for (const bucket of uniqueBuckets) {
        try {
            console.log(`Setting CORS for bucket: ${bucket}...`);
            await client.send(
                new PutBucketCorsCommand({
                    Bucket: bucket,
                    CORSConfiguration: corsPolicy,
                })
            );
            console.log(`✅ Success: ${bucket}`);
        } catch (error) {
            console.error(`❌ Failed: ${bucket}`, error.message);
        }
    }
}

run();
