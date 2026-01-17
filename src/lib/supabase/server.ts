import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

function getClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase server env vars.");
  }

  client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

export const supabaseServer = new Proxy({} as SupabaseClient, {
  get: (_target, prop) => {
    const instance = getClient();
    const value = instance[prop as keyof SupabaseClient];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
