import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

function getClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public env vars.");
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

export const supabaseClient = new Proxy({} as SupabaseClient, {
  get: (_target, prop) => {
    const instance = getClient();
    const value = instance[prop as keyof SupabaseClient];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
