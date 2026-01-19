import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const creditosPadrao: Record<string, number> = {
  Essential: 0,
  Pro: 10000,
  Premium: 30000,
};

const payloadSchema = z.object({
  plan: z.enum(["Essential", "Pro", "Premium"]),
  period: z.enum(["mensal", "semestral", "anual"]),
});

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

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  if (membership.role !== "ADMIN") {
    return forbidden("Forbidden.");
  }

  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }
  const { plan, period } = parsed.data;

  const agora = new Date();
  const trialEnds = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);
  const addMonths = (data: Date, meses: number) => {
    const year = data.getFullYear();
    const month = data.getMonth() + meses;
    const day = data.getDate();
    const tentativa = new Date(year, month, day);
    if (tentativa.getMonth() !== ((month % 12) + 12) % 12) {
      return new Date(year, month + 1, 0);
    }
    return tentativa;
  };

  const { data: currentWorkspace } = await userClient
    .from("workspaces")
    .select("plano_selected_at, trial_started_at, trial_ends_at")
    .eq("id", membership.workspace_id)
    .maybeSingle();

  const { data: currentCredits } = await userClient
    .from("workspace_credits")
    .select("credits_total, credits_used")
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  const planoSelecionadoEm =
    currentWorkspace?.plano_selected_at ?? agora.toISOString();
  const trialStartedAt =
    currentWorkspace?.trial_started_at ?? agora.toISOString();
  const trialEndsAt =
    currentWorkspace?.trial_ends_at ?? trialEnds.toISOString();
  const renovaEm =
    period === "anual"
      ? addMonths(agora, 12)
      : period === "semestral"
        ? addMonths(agora, 6)
        : addMonths(agora, 1);

  const { data: workspace, error: workspaceError } = await userClient
    .from("workspaces")
    .update({
      plano: plan,
      plano_periodo: period,
      plano_selected_at: planoSelecionadoEm,
      trial_started_at: trialStartedAt,
      trial_ends_at: trialEndsAt,
      plano_renova_em: renovaEm.toISOString(),
    })
    .eq("id", membership.workspace_id)
    .select("id, plano, plano_periodo, plano_selected_at, trial_started_at, trial_ends_at")
    .maybeSingle();

  if (workspaceError) {
    return serverError(workspaceError.message);
  }

  const creditsTotal = creditosPadrao[plan] ?? 0;
  let creditsUsed = currentCredits?.credits_used ?? 0;

  const totalAtual = currentCredits?.credits_total ?? null;
  if (typeof totalAtual === "number" && creditsTotal < totalAtual) {
    const restanteAtual = Math.max(0, totalAtual - (currentCredits?.credits_used ?? 0));
    const restanteNovo = Math.min(restanteAtual, creditsTotal);
    creditsUsed = Math.max(0, creditsTotal - restanteNovo);
  }

  await userClient
    .from("workspace_credits")
    .upsert(
      {
        workspace_id: membership.workspace_id,
        credits_total: creditsTotal,
        credits_used: creditsUsed,
      },
      { onConflict: "workspace_id" }
    );

  return Response.json({ workspace });
}
