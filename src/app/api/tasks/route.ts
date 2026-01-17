import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const tiposValidos = ["ligacao", "reuniao", "follow-up", "email", "outro"] as const;
const relacionamentosValidos = ["lead", "deal", "conversa", "outro"] as const;
const statusValidos = ["pendente", "concluida"] as const;

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const formatarHora = (dataISO: string | null) => {
  if (!dataISO) return "";
  const data = new Date(dataISO);
  const horas = String(data.getHours()).padStart(2, "0");
  const minutos = String(data.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
};

const querySchema = z.object({
  status: z.enum([...statusValidos, "todos"] as const).optional(),
  tipo: z.enum([...tiposValidos, "todos"] as const).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

const createSchema = z.object({
  titulo: z.string().trim().min(1),
  tipo: z.enum(tiposValidos).optional(),
  tipoOutro: z.string().trim().nullable().optional(),
  data: z.string().trim().min(1),
  hora: z.string().trim().optional(),
  relacionamentoTipo: z.enum([...relacionamentosValidos, "nenhum"] as const).optional(),
  relacionamentoNome: z.string().trim().nullable().optional(),
});

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
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: searchParams.get("status") || undefined,
    tipo: searchParams.get("tipo") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  });
  if (!parsed.success) {
    return badRequest("Invalid query params.");
  }
  const { status, tipo, from, to } = parsed.data;

  let query = userClient
    .from("tasks")
    .select(
      "id, titulo, tipo, tipo_outro, status, due_at, criado_por_tipo, task_relations(relacionamento_tipo, relacionamento_nome)"
    )
    .eq("user_id", user.id)
    .eq("workspace_id", membership.workspace_id)
    .order("due_at", { ascending: true });

  if (status && status !== "todos") {
    query = query.eq("status", status);
  }

  if (tipo && tipo !== "todos") {
    query = query.eq("tipo", tipo);
  }

  if (from) {
    query = query.gte("due_at", from);
  }

  if (to) {
    query = query.lte("due_at", to);
  }

  const { data: tasks, error } = await query;
  if (error) {
    return serverError(error.message);
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("nome, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const responsavel =
    profile?.nome ?? profile?.email ?? user.email ?? "Você";

  const payload = (tasks ?? []).map((task) => {
    const relation = Array.isArray(task.task_relations)
      ? task.task_relations[0]
      : task.task_relations;
    return {
      id: task.id,
      titulo: task.titulo,
      tipo: task.tipo,
      tipoOutro: task.tipo_outro ?? undefined,
      data: task.due_at,
      hora: formatarHora(task.due_at),
      responsavel,
      relacionamentoTipo: relation?.relacionamento_tipo ?? undefined,
      relacionamentoNome: relation?.relacionamento_nome ?? undefined,
      criadoPor: task.criado_por_tipo ?? "usuario",
      status: task.status,
    };
  });

  return Response.json({ tasks: payload });
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
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return badRequest("Workspace not found.");
  }

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }

  const tipo = parsed.data.tipo ?? "outro";
  const hora = parsed.data.hora ?? "09:00";
  const relacionamentoTipo = parsed.data.relacionamentoTipo ?? null;
  const relacionamentoNome = parsed.data.relacionamentoNome ?? null;

  const dueAt = new Date(`${parsed.data.data}T${hora}:00`).toISOString();

  const { data: tarefa, error } = await userClient
    .from("tasks")
    .insert({
      workspace_id: membership.workspace_id,
      user_id: user.id,
      titulo: parsed.data.titulo,
      tipo,
      tipo_outro: tipo === "outro" ? parsed.data.tipoOutro ?? null : null,
      status: "pendente",
      due_at: dueAt,
      responsavel_id: user.id,
      criado_por_tipo: "usuario",
      criado_por_id: user.id,
    })
    .select("id, titulo, tipo, tipo_outro, status, due_at, criado_por_tipo")
    .single();

  if (error || !tarefa) {
    return serverError(error?.message ?? "Failed to create task");
  }

  if (relacionamentoTipo && relacionamentoTipo !== "nenhum") {
    await userClient.from("task_relations").insert({
      task_id: tarefa.id,
      relacionamento_tipo: relacionamentoTipo,
      relacionamento_nome: relacionamentoNome,
    });
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("nome, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const responsavel =
    profile?.nome ?? profile?.email ?? user.email ?? "Você";

  return Response.json({
    id: tarefa.id,
    titulo: tarefa.titulo,
    tipo: tarefa.tipo,
    tipoOutro: tarefa.tipo_outro ?? undefined,
    data: tarefa.due_at,
    hora: formatarHora(tarefa.due_at),
    responsavel,
    relacionamentoTipo:
      relacionamentoTipo && relacionamentoTipo !== "nenhum"
        ? relacionamentoTipo
        : undefined,
    relacionamentoNome: relacionamentoNome ?? undefined,
    criadoPor: tarefa.criado_por_tipo ?? "usuario",
    status: tarefa.status,
  });
}
