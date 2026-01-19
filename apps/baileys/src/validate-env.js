import {
  AGENTS_API_URL,
  API_KEY,
  R2_ACCESS_KEY_ID,
  R2_ENDPOINT,
  R2_SECRET_ACCESS_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "./config.js";

export const validateEnv = ({ logger } = {}) => {
  const errors = [];
  const warn = (message) => {
    if (logger?.warn) {
      logger.warn(message);
    } else {
      console.warn(message);
    }
  };

  if (!AGENTS_API_URL) {
    warn("AGENTS_API_URL not configured. Agents notifications are disabled.");
  }
  if (!API_KEY) {
    warn("BAILEYS_API_KEY not configured. API auth is disabled.");
  }
  const historyDaysRaw = process.env.BAILEYS_HISTORY_DAYS;
  if (historyDaysRaw) {
    const parsed = Number.parseInt(historyDaysRaw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      warn(
        "BAILEYS_HISTORY_DAYS invalido. Use um numero inteiro maior que zero."
      );
    }
  }
  if (process.env.BAILEYS_REDIS_QUEUE_ENABLED === "true") {
    if (!process.env.REDIS_URL) {
      warn("REDIS_URL not configured. Redis queue is disabled.");
    }
  }
  const batchSizeRaw = process.env.BAILEYS_DB_BATCH_SIZE;
  if (batchSizeRaw) {
    const parsed = Number.parseInt(batchSizeRaw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      warn("BAILEYS_DB_BATCH_SIZE invalido. Use um numero inteiro > 0.");
    }
  }

  if (!SUPABASE_URL) errors.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) errors.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!R2_ACCESS_KEY_ID) errors.push("R2_ACCESS_KEY_ID");
  if (!R2_SECRET_ACCESS_KEY) errors.push("R2_SECRET_ACCESS_KEY");
  if (!R2_ENDPOINT) errors.push("R2_ENDPOINT");

  if (errors.length > 0) {
    throw new Error(`Missing env vars: ${errors.join(", ")}`);
  }
};
