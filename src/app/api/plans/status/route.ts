import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { notFound, serverError, unauthorized } from "@/lib/api/responses";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

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
    return serverError("Missing Supabase env vars.");
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return unauthorized("Missing auth header.");
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return unauthorized("Invalid auth.");
  }

  const { data: membership } = await supabaseServer
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return notFound("Workspace not found.");
  }

  const { data: workspace } = await supabaseServer
    .from("workspaces")
    .select("plano_selected_at, trial_ends_at")
    .eq("id", membership.workspace_id)
    .maybeSingle();

  if (!workspace) {
    return notFound("Workspace not found.");
  }

  const planoSelecionado = Boolean(workspace.plano_selected_at);
  const trialEndsAt = workspace.trial_ends_at ?? null;
  const trialExpirado =
    Boolean(trialEndsAt) && Date.parse(trialEndsAt as string) < Date.now();

  const status = planoSelecionado
    ? "active"
    : trialExpirado
      ? "trial_expired"
      : "trialing";

  return Response.json({
    status,
    planoSelecionadoEm: workspace.plano_selected_at,
    trialEndsAt,
  });
}
