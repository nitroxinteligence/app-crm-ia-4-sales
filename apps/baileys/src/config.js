import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

export const PORT = Number(process.env.PORT ?? 3030);
export const API_KEY = process.env.BAILEYS_API_KEY ?? "";
export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const AGENTS_API_URL = process.env.AGENTS_API_URL ?? "";
export const AGENTS_API_KEY = process.env.AGENTS_API_KEY ?? "";
export const PUSHER_APP_ID = process.env.PUSHER_APP_ID ?? "";
export const PUSHER_KEY = process.env.PUSHER_KEY ?? "";
export const PUSHER_SECRET = process.env.PUSHER_SECRET ?? "";
export const PUSHER_CLUSTER = process.env.PUSHER_CLUSTER ?? "";
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
export const R2_ENDPOINT =
  process.env.R2_ENDPOINT ??
  (R2_ACCOUNT_ID
    ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : "");
export const R2_BUCKET_INBOX_ATTACHMENTS =
  process.env.R2_BUCKET_INBOX_ATTACHMENTS ?? "ia-four-sales-crm";
export const BAILEYS_RESTART_BACKOFF_MS = Number(
  process.env.BAILEYS_RESTART_BACKOFF_MS ?? 1200
);
export const BAILEYS_RESTART_MAX_BACKOFF_MS = Number(
  process.env.BAILEYS_RESTART_MAX_BACKOFF_MS ?? 30000
);
export const BAILEYS_KEEP_ALIVE_MS = Number(
  process.env.BAILEYS_KEEP_ALIVE_MS ?? 20000
);
export const BAILEYS_CONNECT_TIMEOUT_MS = Number(
  process.env.BAILEYS_CONNECT_TIMEOUT_MS ?? 60000
);
export const BAILEYS_DEFAULT_QUERY_TIMEOUT_MS = Number(
  process.env.BAILEYS_DEFAULT_QUERY_TIMEOUT_MS ?? 60000
);
export const BAILEYS_RETRY_REQUEST_DELAY_MS = Number(
  process.env.BAILEYS_RETRY_REQUEST_DELAY_MS ?? 5000
);
export const BAILEYS_SYNC_FULL_HISTORY =
  process.env.BAILEYS_SYNC_FULL_HISTORY === "true";
const historyDaysRaw = Number.parseInt(
  process.env.BAILEYS_HISTORY_DAYS ?? "",
  10
);
export const BAILEYS_HISTORY_DAYS =
  Number.isFinite(historyDaysRaw) && historyDaysRaw > 0
    ? historyDaysRaw
    : 14;
export const REDIS_URL = process.env.REDIS_URL ?? "";
export const BAILEYS_REDIS_QUEUE_ENABLED =
  process.env.BAILEYS_REDIS_QUEUE_ENABLED === "true";
export const BAILEYS_REDIS_QUEUE_INCLUDE_REALTIME =
  process.env.BAILEYS_REDIS_QUEUE_INCLUDE_REALTIME === "true";
export const BAILEYS_REDIS_STREAM_KEY =
  process.env.BAILEYS_REDIS_STREAM_KEY ?? "baileys:message-queue";
export const BAILEYS_REDIS_CONSUMER_GROUP =
  process.env.BAILEYS_REDIS_CONSUMER_GROUP ?? "baileys";
export const BAILEYS_REDIS_BATCH_SIZE = Number(
  process.env.BAILEYS_REDIS_BATCH_SIZE ?? 100
);
export const BAILEYS_REDIS_BLOCK_MS = Number(
  process.env.BAILEYS_REDIS_BLOCK_MS ?? 2000
);
export const BAILEYS_REDIS_MAXLEN = Number(
  process.env.BAILEYS_REDIS_MAXLEN ?? 20000
);
export const BAILEYS_RESTART_MAX_ATTEMPTS = Number(
  process.env.BAILEYS_RESTART_MAX_ATTEMPTS ?? 8
);
export const BAILEYS_BAD_SESSION_THRESHOLD = Number(
  process.env.BAILEYS_BAD_SESSION_THRESHOLD ?? 3
);
export const BAILEYS_BAD_SESSION_WINDOW_MS = Number(
  process.env.BAILEYS_BAD_SESSION_WINDOW_MS ?? 10 * 60 * 1000
);
export const BAILEYS_RETRY_QUEUE_ENABLED =
  process.env.BAILEYS_RETRY_QUEUE_ENABLED !== "false";
export const BAILEYS_RETRY_QUEUE_PATH =
  process.env.BAILEYS_RETRY_QUEUE_PATH ?? "logs/baileys-retry-queue.jsonl";
export const BAILEYS_RETRY_QUEUE_FLUSH_INTERVAL_MS = Number(
  process.env.BAILEYS_RETRY_QUEUE_FLUSH_INTERVAL_MS ?? 5000
);
export const BAILEYS_RETRY_QUEUE_MAX = Number(
  process.env.BAILEYS_RETRY_QUEUE_MAX ?? 5000
);
export const BAILEYS_RETRY_QUEUE_COOLDOWN_MS = Number(
  process.env.BAILEYS_RETRY_QUEUE_COOLDOWN_MS ?? 15000
);
export const BAILEYS_DB_BATCH_ENABLED =
  process.env.BAILEYS_DB_BATCH_ENABLED !== "false";
export const BAILEYS_DB_BATCH_SIZE = Number(
  process.env.BAILEYS_DB_BATCH_SIZE ?? 100
);
export const BAILEYS_DB_BATCH_FLUSH_MS = Number(
  process.env.BAILEYS_DB_BATCH_FLUSH_MS ?? 500
);
