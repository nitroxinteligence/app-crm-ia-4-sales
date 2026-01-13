import { createClient } from "@supabase/supabase-js";

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

function formatarDataISO(data: Date) {
  return data.toISOString().slice(0, 10);
}

async function resolveWorkspaceId(
  userClient: ReturnType<typeof createClient>,
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

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response("Missing Supabase env vars", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header", { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response("Invalid auth", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const canal = searchParams.get("canal");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const workspaceResolved = await resolveWorkspaceId(userClient, workspaceId);

  if (!workspaceResolved) {
    return new Response("Forbidden", { status: 403 });
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

  const inboxQuery = userClient
    .from("v_inbox_daily")
    .select(
      "dia, canal, mensagens_recebidas, mensagens_enviadas, mensagens_internas, conversas_ativas, conversas_abertas, conversas_pendentes, conversas_resolvidas, conversas_spam"
    )
    .eq("workspace_id", workspaceResolved)
    .gte("dia", from)
    .lte("dia", to);

  if (canal && canal !== "todos") {
    inboxQuery.eq("canal", canal);
  }

  const activityQuery = userClient
    .from("v_activity_daily")
    .select("dia, actor_type, actor_id, canal, total_eventos, mensagens")
    .eq("workspace_id", workspaceResolved)
    .gte("dia", from)
    .lte("dia", to);

  if (canal && canal !== "todos") {
    activityQuery.eq("canal", canal);
  }

  const refreshQuery = userClient
    .from("report_refresh_state")
    .select("last_refreshed_at")
    .eq("id", 1)
    .maybeSingle();

  const [inboxResult, activityResult, refreshResult] = await Promise.all([
    inboxQuery,
    activityQuery,
    refreshQuery,
  ]);

  if (inboxResult.error || activityResult.error) {
    const message = inboxResult.error?.message ?? activityResult.error?.message;
    return new Response(message ?? "Failed to load report", { status: 500 });
  }

  const inboxData = inboxResult.data ?? [];
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

  const mapaDias = new Map<
    string,
    {
      mensagensRecebidas: number;
      mensagensEnviadas: number;
      mensagensInternas: number;
      conversasAtivas: number;
      conversasAbertas: number;
      conversasPendentes: number;
      conversasResolvidas: number;
      conversasSpam: number;
    }
  >();

  for (const row of inboxData) {
    const dia = row.dia as string;
    const atual = mapaDias.get(dia) ?? {
      mensagensRecebidas: 0,
      mensagensEnviadas: 0,
      mensagensInternas: 0,
      conversasAtivas: 0,
      conversasAbertas: 0,
      conversasPendentes: 0,
      conversasResolvidas: 0,
      conversasSpam: 0,
    };

    atual.mensagensRecebidas += row.mensagens_recebidas ?? 0;
    atual.mensagensEnviadas += row.mensagens_enviadas ?? 0;
    atual.mensagensInternas += row.mensagens_internas ?? 0;
    atual.conversasAtivas += row.conversas_ativas ?? 0;
    atual.conversasAbertas += row.conversas_abertas ?? 0;
    atual.conversasPendentes += row.conversas_pendentes ?? 0;
    atual.conversasResolvidas += row.conversas_resolvidas ?? 0;
    atual.conversasSpam += row.conversas_spam ?? 0;

    mapaDias.set(dia, atual);
  }

  const serieAtendimentos = dias.map((dia) => {
    const valores = mapaDias.get(dia);
    return {
      date: dia,
      humano: valores?.mensagensRecebidas ?? 0,
      ia: valores?.mensagensEnviadas ?? 0,
    };
  });

  const serieResolvidasPendentes = dias.map((dia) => {
    const valores = mapaDias.get(dia);
    return {
      date: dia,
      humano: valores?.conversasResolvidas ?? 0,
      ia: valores?.conversasPendentes ?? 0,
    };
  });

  const serieAbertasSpam = dias.map((dia) => {
    const valores = mapaDias.get(dia);
    return {
      date: dia,
      humano: valores?.conversasAbertas ?? 0,
      ia: valores?.conversasSpam ?? 0,
    };
  });

  const totais = [...mapaDias.values()].reduce(
    (acc, atual) => ({
      mensagensRecebidas: acc.mensagensRecebidas + atual.mensagensRecebidas,
      mensagensEnviadas: acc.mensagensEnviadas + atual.mensagensEnviadas,
      mensagensInternas: acc.mensagensInternas + atual.mensagensInternas,
      conversasAtivas: acc.conversasAtivas + atual.conversasAtivas,
      conversasAbertas: acc.conversasAbertas + atual.conversasAbertas,
      conversasPendentes: acc.conversasPendentes + atual.conversasPendentes,
      conversasResolvidas: acc.conversasResolvidas + atual.conversasResolvidas,
      conversasSpam: acc.conversasSpam + atual.conversasSpam,
    }),
    {
      mensagensRecebidas: 0,
      mensagensEnviadas: 0,
      mensagensInternas: 0,
      conversasAtivas: 0,
      conversasAbertas: 0,
      conversasPendentes: 0,
      conversasResolvidas: 0,
      conversasSpam: 0,
    }
  );

  const statusPorCanal = new Map<string, number>();
  for (const row of inboxData) {
    const canalId = (row.canal as string) ?? "";
    const atual = statusPorCanal.get(canalId) ?? 0;
    statusPorCanal.set(
      canalId,
      atual +
        (row.mensagens_recebidas ?? 0) +
        (row.mensagens_enviadas ?? 0)
    );
  }

  const conversasPorCanal = [...statusPorCanal.entries()].map(
    ([categoria, valor]) => ({ categoria, valor })
  );

  const conversasPorStatus = [
    { categoria: "Abertas", valor: totais.conversasAbertas },
    { categoria: "Pendentes", valor: totais.conversasPendentes },
    { categoria: "Resolvidas", valor: totais.conversasResolvidas },
    { categoria: "Spam", valor: totais.conversasSpam },
  ];

  const atendentesMap = new Map<string, number>();
  for (const row of activityData) {
    if (!row.actor_id || row.actor_type !== "user") continue;
    const atual = atendentesMap.get(row.actor_id) ?? 0;
    atendentesMap.set(row.actor_id, atual + (row.mensagens ?? 0));
  }

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
        id: "kpi-total-atendimentos",
        titulo: "Conversas ativas",
        valor: String(totais.conversasAtivas),
        descricao: "Conversas movimentadas no período",
      },
      {
        id: "kpi-encerrados",
        titulo: "Conversas resolvidas",
        valor: String(totais.conversasResolvidas),
        descricao: "Conversas finalizadas",
      },
      {
        id: "kpi-conversas-iniciadas",
        titulo: "Conversas abertas",
        valor: String(totais.conversasAbertas),
        descricao: "Conversas em andamento",
      },
      {
        id: "kpi-conversas-aguardando",
        titulo: "Conversas pendentes",
        valor: String(totais.conversasPendentes),
        descricao: "Aguardando retorno",
      },
    ],
    series: {
      atendimentos: {
        id: "atendimentos",
        titulo: "Mensagens no período",
        descricao: "Recebidas x enviadas",
        pontos: serieAtendimentos,
      },
      resolvidasPendentes: {
        id: "status-resolvidas",
        titulo: "Conversas resolvidas x pendentes",
        descricao: "Comparativo diário por status",
        pontos: serieResolvidasPendentes,
      },
      abertasSpam: {
        id: "status-abertas",
        titulo: "Conversas abertas x spam",
        descricao: "Volume diário por status",
        pontos: serieAbertasSpam,
      },
      porStatus: {
        id: "conversas-por-status",
        titulo: "Conversas por status",
        descricao: "Distribuição no período",
        categorias: conversasPorStatus.map((item) => item.categoria),
        valores: conversasPorStatus.map((item) => item.valor),
      },
      porCanal: {
        id: "conversas-por-canal",
        titulo: "Mensagens por canal",
        descricao: "Distribuição no período",
        categorias: conversasPorCanal.map((item) => item.categoria),
        valores: conversasPorCanal.map((item) => item.valor),
        layout: "vertical",
      },
      atendentes,
    },
  });
}
