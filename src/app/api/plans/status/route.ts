import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response("Missing Supabase env vars.", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header.", { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response("Invalid auth.", { status: 401 });
  }

  const { data: membership } = await supabaseServer
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return new Response("Workspace not found.", { status: 404 });
  }

  const { data: workspace } = await supabaseServer
    .from("workspaces")
    .select("plano_selected_at, trial_ends_at")
    .eq("id", membership.workspace_id)
    .maybeSingle();

  if (!workspace) {
    return new Response("Workspace not found.", { status: 404 });
  }

  const planoSelecionado = Boolean(workspace.plano_selected_at);
  const trialEndsAt = workspace.trial_ends_at ?? null;
  const trialExpirado =
    planoSelecionado &&
    Boolean(trialEndsAt) &&
    Date.parse(trialEndsAt as string) < Date.now();

  const status = !planoSelecionado
    ? "plan_unselected"
    : trialExpirado
      ? "trial_expired"
      : "trialing";

  return Response.json({
    status,
    planoSelecionadoEm: workspace.plano_selected_at,
    trialEndsAt,
  });
}
