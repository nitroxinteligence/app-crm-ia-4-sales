import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const creditosPadrao: Record<string, number> = {
  Essential: 0,
  Pro: 10000,
  Premium: 30000,
};

type Payload = {
  plan?: "Essential" | "Pro" | "Premium";
  period?: "mensal" | "semestral" | "anual";
};

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
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

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return new Response("Workspace not found.", { status: 400 });
  }

  if (membership.role !== "ADMIN") {
    return new Response("Forbidden.", { status: 403 });
  }

  const body = (await request.json()) as Payload;
  const plan = body?.plan;
  const period = body?.period;

  if (!plan || !period) {
    return new Response("Invalid payload.", { status: 400 });
  }

  const agora = new Date();
  const trialEnds = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { data: currentWorkspace } = await userClient
    .from("workspaces")
    .select("plano_selected_at, trial_started_at, trial_ends_at")
    .eq("id", membership.workspace_id)
    .maybeSingle();

  const planoSelecionadoEm =
    currentWorkspace?.plano_selected_at ?? agora.toISOString();
  const trialStartedAt =
    currentWorkspace?.trial_started_at ?? agora.toISOString();
  const trialEndsAt =
    currentWorkspace?.trial_ends_at ?? trialEnds.toISOString();

  const { data: workspace, error: workspaceError } = await userClient
    .from("workspaces")
    .update({
      plano: plan,
      plano_periodo: period,
      plano_selected_at: planoSelecionadoEm,
      trial_started_at: trialStartedAt,
      trial_ends_at: trialEndsAt,
    })
    .eq("id", membership.workspace_id)
    .select("id, plano, plano_periodo, plano_selected_at, trial_started_at, trial_ends_at")
    .maybeSingle();

  if (workspaceError) {
    return new Response(workspaceError.message, { status: 500 });
  }

  const creditsTotal = creditosPadrao[plan] ?? 0;
  await userClient
    .from("workspace_credits")
    .upsert(
      {
        workspace_id: membership.workspace_id,
        credits_total: creditsTotal,
      },
      { onConflict: "workspace_id" }
    );

  return Response.json({ workspace });
}
