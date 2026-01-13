const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase server env vars.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function refreshViews() {
  const { error } = await supabase.rpc("refresh_report_views");
  if (error) {
    throw error;
  }
}

refreshViews()
  .then(() => {
    console.log("Report views refreshed.");
  })
  .catch((error) => {
    console.error("Failed to refresh report views:", error.message);
    process.exitCode = 1;
  });
