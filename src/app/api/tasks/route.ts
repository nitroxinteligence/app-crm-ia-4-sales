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

const formatarHora = (dataISO: string | null) => {
  if (!dataISO) return "";
  const data = new Date(dataISO);
  const horas = String(data.getHours()).padStart(2, "0");
  const minutos = String(data.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
};

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

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return new Response("Workspace not found", { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const tipo = searchParams.get("tipo");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

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
    return new Response(error.message, { status: 500 });
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

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return new Response("Workspace not found", { status: 400 });
  }

  const body = await request.json();
  const titulo = body?.titulo?.trim();
  const tipo = body?.tipo ?? "outro";
  const tipoOutro = body?.tipoOutro ?? null;
  const data = body?.data;
  const hora = body?.hora ?? "09:00";
  const relacionamentoTipo = body?.relacionamentoTipo ?? null;
  const relacionamentoNome = body?.relacionamentoNome ?? null;

  if (!titulo || !data) {
    return new Response("Invalid payload", { status: 400 });
  }

  const dueAt = new Date(`${data}T${hora}:00`).toISOString();

  const { data: tarefa, error } = await userClient
    .from("tasks")
    .insert({
      workspace_id: membership.workspace_id,
      user_id: user.id,
      titulo,
      tipo,
      tipo_outro: tipo === "outro" ? tipoOutro : null,
      status: "pendente",
      due_at: dueAt,
      responsavel_id: user.id,
      criado_por_tipo: "usuario",
      criado_por_id: user.id,
    })
    .select("id, titulo, tipo, tipo_outro, status, due_at, criado_por_tipo")
    .single();

  if (error || !tarefa) {
    return new Response(error?.message ?? "Failed to create task", {
      status: 500,
    });
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
