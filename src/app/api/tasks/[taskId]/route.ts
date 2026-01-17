import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

const tiposValidos = ["ligacao", "reuniao", "follow-up", "email", "outro"] as const;
const relacionamentosValidos = ["lead", "deal", "conversa", "outro"] as const;
const statusValidos = ["pendente", "concluida"] as const;

const formatarHora = (dataISO: string | null) => {
  if (!dataISO) return "";
  const data = new Date(dataISO);
  const horas = String(data.getHours()).padStart(2, "0");
  const minutos = String(data.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
};

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const paramsSchema = z.object({
  taskId: z.string().trim().min(1),
});

const updateSchema = z
  .object({
    titulo: z.string().trim().min(1).optional(),
    tipo: z.enum(tiposValidos).optional(),
    tipoOutro: z.string().trim().nullable().optional(),
    status: z.enum(statusValidos).optional(),
    data: z.string().trim().optional(),
    hora: z.string().trim().optional(),
    relacionamentoTipo: z.enum([...relacionamentosValidos, "nenhum"] as const).optional(),
    relacionamentoNome: z.string().trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No valid fields to update",
  });

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
  const parsedParams = paramsSchema.safeParse({ taskId });
  if (!parsedParams.success) {
    return badRequest("Invalid task id.");
  }

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

  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }

  const {
    titulo,
    tipo,
    tipoOutro,
    status,
    data,
    hora,
    relacionamentoTipo,
    relacionamentoNome,
  } = parsed.data;

  const updates: Record<string, string | null> = {};
  if (titulo) updates.titulo = titulo;
  if (tipo) updates.tipo = tipo;
  if (tipo !== undefined) {
    updates.tipo_outro = tipo === "outro" ? tipoOutro ?? null : null;
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
      return serverError(error.message);
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
    return serverError(tarefaError?.message ?? "Task not found");
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
  const parsedParams = paramsSchema.safeParse({ taskId });
  if (!parsedParams.success) {
    return badRequest("Invalid task id.");
  }

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

  const { error } = await userClient.from("tasks").delete().eq("id", taskId);

  if (error) {
    return serverError(error.message);
  }

  return Response.json({ ok: true });
}
