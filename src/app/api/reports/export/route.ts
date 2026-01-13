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

function csvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const texto = String(value);
  const precisaEscapar = /[",\n]/.test(texto);
  const escapado = texto.replace(/"/g, '""');
  return precisaEscapar ? `"${escapado}"` : escapado;
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
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const tipo = searchParams.get("tipo");
  const canal = searchParams.get("canal");

  if (!from || !to) {
    return new Response("Missing from/to", { status: 400 });
  }

  if (!tipo || !["negocios", "atendimentos"].includes(tipo)) {
    return new Response("Invalid tipo", { status: 400 });
  }

  const workspaceResolved = await resolveWorkspaceId(userClient, workspaceId);
  if (!workspaceResolved) {
    return new Response("Forbidden", { status: 403 });
  }

  if (tipo === "negocios") {
    const query = userClient
      .from("v_leads_daily")
      .select("dia, canal, leads_criados, leads_convertidos")
      .eq("workspace_id", workspaceResolved)
      .gte("dia", from)
      .lte("dia", to)
      .order("dia", { ascending: true });

    if (canal && canal !== "todos") {
      query.eq("canal", canal);
    }

    const { data, error } = await query;
    if (error) {
      return new Response(error.message, { status: 500 });
    }

    const header = ["dia", "canal", "leads_criados", "leads_convertidos"];
    const rows = (data ?? []).map((row) =>
      [
        row.dia,
        row.canal,
        row.leads_criados,
        row.leads_convertidos,
      ]
        .map(csvValue)
        .join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=relatorio-negocios-${from}-${to}.csv`,
      },
    });
  }

  const query = userClient
    .from("v_inbox_daily")
    .select(
      "dia, canal, mensagens_recebidas, mensagens_enviadas, mensagens_internas, conversas_ativas, conversas_abertas, conversas_pendentes, conversas_resolvidas, conversas_spam"
    )
    .eq("workspace_id", workspaceResolved)
    .gte("dia", from)
    .lte("dia", to)
    .order("dia", { ascending: true });

  if (canal && canal !== "todos") {
    query.eq("canal", canal);
  }

  const { data, error } = await query;
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const header = [
    "dia",
    "canal",
    "mensagens_recebidas",
    "mensagens_enviadas",
    "mensagens_internas",
    "conversas_ativas",
    "conversas_abertas",
    "conversas_pendentes",
    "conversas_resolvidas",
    "conversas_spam",
  ];

  const rows = (data ?? []).map((row) =>
    [
      row.dia,
      row.canal,
      row.mensagens_recebidas,
      row.mensagens_enviadas,
      row.mensagens_internas,
      row.conversas_ativas,
      row.conversas_abertas,
      row.conversas_pendentes,
      row.conversas_resolvidas,
      row.conversas_spam,
    ]
      .map(csvValue)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=relatorio-atendimentos-${from}-${to}.csv`,
    },
  });
}
