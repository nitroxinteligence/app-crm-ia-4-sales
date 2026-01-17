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

  if (!SUPABASE_URL) errors.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) errors.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!R2_ACCESS_KEY_ID) errors.push("R2_ACCESS_KEY_ID");
  if (!R2_SECRET_ACCESS_KEY) errors.push("R2_SECRET_ACCESS_KEY");
  if (!R2_ENDPOINT) errors.push("R2_ENDPOINT");

  if (errors.length > 0) {
    throw new Error(`Missing env vars: ${errors.join(", ")}`);
  }
};
