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
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  tipo: z.enum(["negocios", "atendimentos"]),
  canal: z.string().trim().optional(),
});

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
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    tipo: searchParams.get("tipo") ?? undefined,
    canal: searchParams.get("canal") ?? undefined,
  });
  if (!parsed.success) {
    return badRequest("Invalid query params.");
  }
  const { workspaceId, from, to, tipo, canal } = parsed.data;

  const workspaceResolved = await resolveWorkspaceId(userClient, workspaceId ?? null);
  if (!workspaceResolved) {
    return forbidden("Forbidden.");
  }

  if (tipo === "negocios") {
    const query = userClient
      .from("v_leads_daily")
      .select("dia, canal, leads_criados, leads_convertidos")
      .eq("workspace_id", workspaceResolved)
      .gte("dia", from)
      .lte("dia", to)
      .order("dia", { ascending: true });

    applyCanalFilter(query, canal);

    const { data, error } = await query;
    if (error) {
      return serverError(error.message);
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

  applyCanalFilter(query, canal);

  const { data, error } = await query;
  if (error) {
    return serverError(error.message);
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
