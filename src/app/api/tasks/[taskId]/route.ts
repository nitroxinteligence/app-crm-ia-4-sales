import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const tiposValidos = ["ligacao", "reuniao", "follow-up", "email", "outro"];
const relacionamentosValidos = ["lead", "deal", "conversa", "outro"];
const statusValidos = ["pendente", "concluida"];

const formatarHora = (dataISO: string | null) => {
  if (!dataISO) return "";
  const data = new Date(dataISO);
  const horas = String(data.getHours()).padStart(2, "0");
  const minutos = String(data.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
};

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
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

  const body = await request.json();
  const titulo = body?.titulo?.trim();
  const tipo = body?.tipo;
  const tipoOutro = body?.tipoOutro ?? null;
  const status = body?.status;
  const data = body?.data;
  const hora = body?.hora;
  const relacionamentoTipo = body?.relacionamentoTipo;
  const relacionamentoNome = body?.relacionamentoNome ?? null;

  if (tipo && !tiposValidos.includes(tipo)) {
    return new Response("Invalid type", { status: 400 });
  }

  if (status && !statusValidos.includes(status)) {
    return new Response("Invalid status", { status: 400 });
  }

  if (
    relacionamentoTipo &&
    relacionamentoTipo !== "nenhum" &&
    !relacionamentosValidos.includes(relacionamentoTipo)
  ) {
    return new Response("Invalid relation type", { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (titulo) updates.titulo = titulo;
  if (tipo) updates.tipo = tipo;
  if (tipo !== undefined) {
    updates.tipo_outro = tipo === "outro" ? tipoOutro : null;
  }
  if (status) updates.status = status;
  if (data && hora) {
    updates.due_at = new Date(`${data}T${hora}:00`).toISOString();
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await userClient
      .from("tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      return new Response(error.message, { status: 500 });
    }
  }

  if (relacionamentoTipo !== undefined) {
    if (!relacionamentoTipo || relacionamentoTipo === "nenhum") {
      await userClient.from("task_relations").delete().eq("task_id", taskId);
    } else {
      await userClient.from("task_relations").upsert(
        {
          task_id: taskId,
          relacionamento_tipo: relacionamentoTipo,
          relacionamento_nome: relacionamentoNome,
        },
        { onConflict: "task_id" }
      );
    }
  }

  const { data: tarefa, error: tarefaError } = await userClient
    .from("tasks")
    .select(
      "id, titulo, tipo, tipo_outro, status, due_at, criado_por_tipo, task_relations(relacionamento_tipo, relacionamento_nome)"
    )
    .eq("id", taskId)
    .maybeSingle();

  if (tarefaError || !tarefa) {
    return new Response(tarefaError?.message ?? "Task not found", {
      status: 500,
    });
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("nome, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const responsavel =
    profile?.nome ?? profile?.email ?? user.email ?? "Você";

  const relation = Array.isArray(tarefa.task_relations)
    ? tarefa.task_relations[0]
    : tarefa.task_relations;

  const horaFormatada = formatarHora(tarefa.due_at);

  return Response.json({
    id: tarefa.id,
    titulo: tarefa.titulo,
    tipo: tarefa.tipo,
    tipoOutro: tarefa.tipo_outro ?? undefined,
    data: tarefa.due_at,
    hora: horaFormatada,
    responsavel,
    relacionamentoTipo: relation?.relacionamento_tipo ?? undefined,
    relacionamentoNome: relation?.relacionamento_nome ?? undefined,
    criadoPor: tarefa.criado_por_tipo ?? "usuario",
    status: tarefa.status,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
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

  const { error } = await userClient.from("tasks").delete().eq("id", taskId);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return Response.json({ ok: true });
}
