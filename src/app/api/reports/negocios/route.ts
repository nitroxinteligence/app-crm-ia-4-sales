import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { applyCanalFilter } from "@/lib/reports/filters";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api/responses";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const querySchema = z.object({
  workspaceId: z.string().trim().optional(),
  canal: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function formatarDataISO(data: Date) {
  return data.toISOString().slice(0, 10);
}

async function resolveWorkspaceId(
  userClient: any,
  requestedId: string | null
) {
  if (requestedId) {
    const { data } = await userClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", requestedId)
      .limit(1)
      .maybeSingle();

    if (data?.workspace_id) {
      return data.workspace_id;
    }
  }

  const { data } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .limit(1)
    .maybeSingle();

  return data?.workspace_id ?? null;
}

function construirIntervaloDatas(inicio: Date, fim: Date) {
  const datas: string[] = [];
  const dataAtual = new Date(inicio);
  dataAtual.setHours(0, 0, 0, 0);

  const dataFim = new Date(fim);
  dataFim.setHours(0, 0, 0, 0);

  while (dataAtual <= dataFim) {
    datas.push(formatarDataISO(dataAtual));
    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  return datas;
}

function calcularVariacao(atual: number, anterior: number) {
  if (!anterior) {
    return "0%";
  }

  const diferenca = ((atual - anterior) / anterior) * 100;
  const sinal = diferenca > 0 ? "+" : diferenca < 0 ? "-" : "";
  return `${sinal}${Math.abs(Math.round(diferenca))}%`;
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

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId") ?? undefined,
    canal: searchParams.get("canal") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return badRequest("Invalid query params.");
  }
  const {
    workspaceId,
    canal,
    from: fromParam,
    to: toParam,
  } = parsed.data;

  const workspaceResolved = await resolveWorkspaceId(userClient, workspaceId ?? null);
  if (!workspaceResolved) {
    return forbidden("Forbidden.");
  }

  const hoje = new Date();
  const fim = toParam ? new Date(toParam) : hoje;
  const inicio = fromParam ? new Date(fromParam) : new Date(fim);
  if (!fromParam) {
    inicio.setDate(inicio.getDate() - 29);
  }

  const from = formatarDataISO(inicio);
  const to = formatarDataISO(fim);
  const dias = construirIntervaloDatas(inicio, fim);
  const diffDias = dias.length;

  const anteriorFim = new Date(inicio);
  anteriorFim.setDate(anteriorFim.getDate() - 1);
  const anteriorInicio = new Date(anteriorFim);
  anteriorInicio.setDate(anteriorInicio.getDate() - (diffDias - 1));

  const anteriorFrom = formatarDataISO(anteriorInicio);
  const anteriorTo = formatarDataISO(anteriorFim);

  const leadsQuery = userClient
    .from("v_leads_daily")
    .select("dia, canal, leads_criados, leads_convertidos")
    .eq("workspace_id", workspaceResolved)
    .gte("dia", from)
    .lte("dia", to);

  const leadsAnteriorQuery = userClient
    .from("v_leads_daily")
    .select("dia, canal, leads_criados, leads_convertidos")
    .eq("workspace_id", workspaceResolved)
    .gte("dia", anteriorFrom)
    .lte("dia", anteriorTo);

  const pipelineQuery = userClient
    .from("v_pipeline_daily")
    .select("dia, pipeline_id, stage_id, mudancas")
    .eq("workspace_id", workspaceResolved)
    .gte("dia", from)
    .lte("dia", to);

  const pipelineAnteriorQuery = userClient
    .from("v_pipeline_daily")
    .select("dia, pipeline_id, stage_id, mudancas")
    .eq("workspace_id", workspaceResolved)
    .gte("dia", anteriorFrom)
    .lte("dia", anteriorTo);

  const inboxQuery = userClient
    .from("v_inbox_daily")
    .select("dia, canal, conversas_resolvidas")
    .eq("workspace_id", workspaceResolved)
    .gte("dia", from)
    .lte("dia", to);

  const inboxAnteriorQuery = userClient
    .from("v_inbox_daily")
    .select("dia, canal, conversas_resolvidas")
    .eq("workspace_id", workspaceResolved)
    .gte("dia", anteriorFrom)
    .lte("dia", anteriorTo);

  const activityQuery = userClient
    .from("v_activity_daily")
    .select("dia, actor_type, actor_id, total_eventos, leads_criados, leads_convertidos")
    .eq("workspace_id", workspaceResolved)
    .gte("dia", from)
    .lte("dia", to);

  applyCanalFilter(leadsQuery, canal);
  applyCanalFilter(leadsAnteriorQuery, canal);
  applyCanalFilter(inboxQuery, canal);
  applyCanalFilter(inboxAnteriorQuery, canal);
  applyCanalFilter(activityQuery, canal);

  const refreshQuery = userClient
    .from("report_refresh_state")
    .select("last_refreshed_at")
    .eq("id", 1)
    .maybeSingle();

  const [
    leadsResult,
    leadsAnteriorResult,
    pipelineResult,
    pipelineAnteriorResult,
    inboxResult,
    inboxAnteriorResult,
    activityResult,
    refreshResult,
  ] = await Promise.all([
    leadsQuery,
    leadsAnteriorQuery,
    pipelineQuery,
    pipelineAnteriorQuery,
    inboxQuery,
    inboxAnteriorQuery,
    activityQuery,
    refreshQuery,
  ]);

  if (
    leadsResult.error ||
    leadsAnteriorResult.error ||
    pipelineResult.error ||
    pipelineAnteriorResult.error ||
    inboxResult.error ||
    inboxAnteriorResult.error ||
    activityResult.error
  ) {
    const message =
      leadsResult.error?.message ??
      leadsAnteriorResult.error?.message ??
      pipelineResult.error?.message ??
      pipelineAnteriorResult.error?.message ??
      inboxResult.error?.message ??
      inboxAnteriorResult.error?.message ??
      activityResult.error?.message;
    return serverError(message ?? "Failed to load report");
  }

  const leadsData = leadsResult.data ?? [];
  const leadsAnteriorData = leadsAnteriorResult.data ?? [];
  const pipelineData = pipelineResult.data ?? [];
  const pipelineAnteriorData = pipelineAnteriorResult.data ?? [];
  const inboxData = inboxResult.data ?? [];
  const inboxAnteriorData = inboxAnteriorResult.data ?? [];
  const activityData = activityResult.data ?? [];
  const ultimaAtualizacao = refreshResult.data?.last_refreshed_at ?? null;

  const actorIds = [
    ...new Set(
      activityData
        .filter((row) => row.actor_id && row.actor_type === "user")
        .map((row) => row.actor_id as string)
    ),
  ];

  const perfisMap = new Map<string, string>();
  if (actorIds.length) {
    const { data: perfis } = await userClient
      .from("profiles")
      .select("user_id, nome, email")
      .in("user_id", actorIds);

    (perfis ?? []).forEach((perfil) => {
      const nome = perfil.nome ?? perfil.email ?? "Usuario";
      perfisMap.set(perfil.user_id, nome);
    });
  }

  const somar = (itens: Array<{ [key: string]: number | null }>, chave: string) =>
    itens.reduce((acc, item) => acc + (item[chave] ?? 0), 0);

  const totalLeads = somar(leadsData, "leads_criados");
  const totalLeadsConvertidos = somar(leadsData, "leads_convertidos");
  const totalMovimentacoes = somar(pipelineData, "mudancas");
  const totalResolvidas = somar(inboxData, "conversas_resolvidas");

  const anteriorLeads = somar(leadsAnteriorData, "leads_criados");
  const anteriorConvertidos = somar(leadsAnteriorData, "leads_convertidos");
  const anteriorMovimentacoes = somar(pipelineAnteriorData, "mudancas");
  const anteriorResolvidas = somar(inboxAnteriorData, "conversas_resolvidas");

  const variacaoLeads = calcularVariacao(totalLeads, anteriorLeads);
  const variacaoConvertidos = calcularVariacao(
    totalLeadsConvertidos,
    anteriorConvertidos
  );
  const variacaoMovimentacoes = calcularVariacao(
    totalMovimentacoes,
    anteriorMovimentacoes
  );
  const variacaoResolvidas = calcularVariacao(totalResolvidas, anteriorResolvidas);

  const mapaMensal = new Map<
    string,
    { leadsCriados: number; leadsConvertidos: number }
  >();

  for (const row of leadsData) {
    const dia = row.dia as string;
    const data = new Date(dia);
    const chave = `${data.getUTCFullYear()}-${String(
      data.getUTCMonth() + 1
    ).padStart(2, "0")}-01`;
    const atual = mapaMensal.get(chave) ?? {
      leadsCriados: 0,
      leadsConvertidos: 0,
    };
    atual.leadsCriados += row.leads_criados ?? 0;
    atual.leadsConvertidos += row.leads_convertidos ?? 0;
    mapaMensal.set(chave, atual);
  }

  const serieMensal = [...mapaMensal.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, valores]) => ({
      date: chave,
      humano: valores.leadsCriados,
      ia: valores.leadsConvertidos,
    }));

  const atendentesMap = new Map<string, number>();
  for (const row of activityData) {
    if (!row.actor_id || row.actor_type !== "user") continue;
    const atual = atendentesMap.get(row.actor_id) ?? 0;
    atendentesMap.set(row.actor_id, atual + (row.total_eventos ?? 0));
  }

  const totalAtendentes = [...atendentesMap.values()].reduce(
    (acc, valor) => acc + valor,
    0
  );

  const percentualAtendente = [...atendentesMap.entries()]
    .map(([id, valor]) => ({
      nome: perfisMap.get(id) ?? `Usuario ${id.slice(0, 6).toUpperCase()}`,
      valor: totalAtendentes ? Math.round((valor / totalAtendentes) * 100) : 0,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  const etapasMap = new Map<string, number>();
  for (const row of pipelineData) {
    if (!row.stage_id) continue;
    const atual = etapasMap.get(row.stage_id) ?? 0;
    etapasMap.set(row.stage_id, atual + (row.mudancas ?? 0));
  }

  const stageIds = [...etapasMap.keys()];

  const stageResult = stageIds.length
    ? await userClient
      .from("pipeline_stages")
      .select("id, nome")
      .in("id", stageIds)
    : { data: [], error: null };

  if (stageResult.error) {
    return serverError(stageResult.error.message);
  }

  const stageMap = new Map(
    (stageResult.data ?? []).map((stage) => [stage.id, stage.nome])
  );

  const etapasMovimentadas = [...etapasMap.entries()]
    .map(([id, valor]) => ({
      nome: stageMap.get(id) ?? "Etapa",
      valor,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  const atendentes = [...atendentesMap.entries()]
    .map(([id, valor]) => ({
      nome: perfisMap.get(id) ?? `Usuario ${id.slice(0, 6).toUpperCase()}`,
      valor,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  return Response.json({
    periodo: { from, to },
    ultimaAtualizacao,
    kpis: [
      {
        id: "leads-criados",
        titulo: "Leads criados",
        valor: String(totalLeads),
        variacao: variacaoLeads,
        subtitulo: `${totalLeads} leads no período`,
      },
      {
        id: "leads-convertidos",
        titulo: "Leads convertidos",
        valor: String(totalLeadsConvertidos),
        variacao: variacaoConvertidos,
        subtitulo: `${totalLeadsConvertidos} conversões`,
      },
      {
        id: "movimentacoes-funil",
        titulo: "Movimentações no funil",
        valor: String(totalMovimentacoes),
        variacao: variacaoMovimentacoes,
        subtitulo: `${totalMovimentacoes} mudanças`,
      },
      {
        id: "conversas-resolvidas",
        titulo: "Conversas resolvidas",
        valor: String(totalResolvidas),
        variacao: variacaoResolvidas,
        subtitulo: `${totalResolvidas} conversas`,
      },
    ],
    series: {
      mensal: {
        id: "leads-mensal",
        titulo: "Leads por mês",
        descricao: "Criados x convertidos",
        pontos: serieMensal,
      },
      percentualAtendente,
      etapasMovimentadas,
      atendentes,
    },
  });
}
