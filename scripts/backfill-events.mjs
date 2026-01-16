import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase server env vars.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function backfillEvents() {
  const { error } = await supabase.rpc("backfill_events");
  if (error) {
    throw error;
  }
}

backfillEvents()
  .then(() => {
    console.log("Events backfill completed.");
  })
  .catch((error) => {
    console.error("Failed to backfill events:", error.message);
    process.exitCode = 1;
  });

