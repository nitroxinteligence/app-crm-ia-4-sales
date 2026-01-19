import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { getEnv } from "@/lib/config";
import { resolverPlanoEfetivo } from "@/lib/planos";

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
    .select(
      "id, nome, plano, trial_ends_at, trial_plano, plano_selected_at, plano_renova_em, created_at"
    )
    .eq("id", membership.workspace_id)
    .maybeSingle();

  if (workspaceError) {
    return serverError(workspaceError.message);
  }

  const planoWorkspace = normalizarPlano(workspace?.plano);
  const planoEfetivo = resolverPlanoEfetivo(workspace);

  const calcularPeriodo = (anchor: Date, agora: Date) => {
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

    let inicio = new Date(anchor);
    inicio.setHours(0, 0, 0, 0);
    let fim = addMonths(inicio, 1);
    fim.setDate(fim.getDate() - 1);
    fim.setHours(23, 59, 59, 999);

    while (agora.getTime() > fim.getTime()) {
      inicio = addMonths(inicio, 1);
      inicio.setHours(0, 0, 0, 0);
      fim = addMonths(inicio, 1);
      fim.setDate(fim.getDate() - 1);
      fim.setHours(23, 59, 59, 999);
    }

    return {
      inicio: inicio.toISOString().slice(0, 10),
      fim: fim.toISOString().slice(0, 10),
    };
  };

  let { data: credits } = await userClient
    .from("workspace_credits")
    .select("credits_total, credits_used, period_start, period_end")
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  const totalEsperado = creditosPadrao[planoEfetivo] ?? creditosPadrao.Essential;
  const createdAt = workspace?.created_at
    ? new Date(workspace.created_at)
    : new Date();
  const agora = new Date();
  const periodo = calcularPeriodo(createdAt, agora);

  if (!credits) {
    const { data: novoCredito } = await userClient
      .from("workspace_credits")
      .upsert({
        workspace_id: membership.workspace_id,
        credits_total: totalEsperado,
        credits_used: 0,
        period_start: periodo.inicio,
        period_end: periodo.fim,
      })
      .select("credits_total, credits_used, period_start, period_end")
      .maybeSingle();
    credits = novoCredito ?? null;
  } else {
    const precisaAtualizarPeriodo =
      !credits.period_end ||
      Date.parse(credits.period_end as string) < agora.getTime();
    const precisaAtualizarTotal = (credits.credits_total ?? 0) !== totalEsperado;
    let creditsUsedAtualizado = credits.credits_used ?? 0;

    if (precisaAtualizarTotal && !precisaAtualizarPeriodo) {
      const totalAtual = credits.credits_total ?? 0;
      if (totalEsperado < totalAtual) {
        const restanteAtual = Math.max(0, totalAtual - (credits.credits_used ?? 0));
        const restanteNovo = Math.min(restanteAtual, totalEsperado);
        creditsUsedAtualizado = Math.max(0, totalEsperado - restanteNovo);
      }
    }

    if (precisaAtualizarPeriodo || precisaAtualizarTotal) {
      const { data: atualizado } = await userClient
        .from("workspace_credits")
        .update({
          credits_total: totalEsperado,
          credits_used: precisaAtualizarPeriodo ? 0 : creditsUsedAtualizado,
          period_start: periodo.inicio,
          period_end: periodo.fim,
        })
        .eq("workspace_id", membership.workspace_id)
        .select("credits_total, credits_used, period_start, period_end")
        .maybeSingle();
      credits = atualizado ?? credits;
    }
  }

  // Fetch usage stats in parallel
  const [
    { count: contactsCount },
    { count: membersCount },
    { count: integrationsCount },
    { count: pipelinesCount },
    { count: agentsCount },
  ] = await Promise.all([
    userClient
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", membership.workspace_id),
    userClient
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", membership.workspace_id),
    userClient
      .from("integrations")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", membership.workspace_id)
      .eq("status", "conectado"),
    userClient
      .from("pipelines")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", membership.workspace_id),
    userClient
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", membership.workspace_id),
  ]);

  return Response.json({
    workspace: workspace
      ? { ...workspace, plano: planoEfetivo }
      : { plano: planoEfetivo },
    credits,
    usage: {
      contacts: contactsCount ?? 0,
      members: membersCount ?? 0,
      integrations: integrationsCount ?? 0,
      pipelines: pipelinesCount ?? 0,
      agents: agentsCount ?? 0,
      workspaces: 1, // Currently fixed to 1 active workspace per plan rule
    },
  });
}
