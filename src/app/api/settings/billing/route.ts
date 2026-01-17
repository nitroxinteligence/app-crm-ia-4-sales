import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const creditosPadrao: Record<string, number> = {
  Essential: 0,
  Pro: 10000,
  Premium: 30000,
};

const normalizarPlano = (
  plano?: string | null
): "Essential" | "Pro" | "Premium" => {
  if (plano === "Basic") return "Essential";
  if (plano === "Essential" || plano === "Pro" || plano === "Premium") {
    return plano;
  }
  return "Essential";
};

const getPeriodoAtual = () => {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
  };
};

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

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const { data: workspace, error: workspaceError } = await userClient
    .from("workspaces")
    .select("id, nome, plano, trial_ends_at, created_at")
    .eq("id", membership.workspace_id)
    .maybeSingle();

  if (workspaceError) {
    return serverError(workspaceError.message);
  }

  const planoWorkspace = normalizarPlano(workspace?.plano);
  const planoEfetivo = membership.role === "ADMIN" ? "Premium" : planoWorkspace;

  let { data: credits } = await userClient
    .from("workspace_credits")
    .select("credits_total, credits_used, period_start, period_end")
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!credits) {
    const periodo = getPeriodoAtual();
    const total = creditosPadrao[planoEfetivo] ?? creditosPadrao.Essential;
    const { data: novoCredito } = await userClient
      .from("workspace_credits")
      .upsert({
        workspace_id: membership.workspace_id,
        credits_total: total,
        credits_used: 0,
        period_start: periodo.inicio,
        period_end: periodo.fim,
      })
      .select("credits_total, credits_used, period_start, period_end")
      .maybeSingle();
    credits = novoCredito ?? null;
  }

  if (credits && planoEfetivo === "Premium") {
    const totalAtual = credits.credits_total ?? 0;
    if (totalAtual < creditosPadrao.Premium) {
      const { data: atualizado } = await userClient
        .from("workspace_credits")
        .update({ credits_total: creditosPadrao.Premium })
        .eq("workspace_id", membership.workspace_id)
        .select("credits_total, credits_used, period_start, period_end")
        .maybeSingle();
      credits = atualizado ?? credits;
    }
  }

  return Response.json({
    workspace: workspace
      ? { ...workspace, plano: planoEfetivo }
      : { plano: planoEfetivo },
    credits,
  });
}
