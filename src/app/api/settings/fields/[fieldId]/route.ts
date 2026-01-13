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

async function getMembership(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Missing Supabase env vars." };
  }
  const userClient = getUserClient(request);
  if (!userClient) {
    return { error: "Missing auth header." };
  }
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return { error: "Invalid auth." };
  }

  const { data: membership, error: membershipError } = await userClient
    .from("workspace_members")
    .select("id, workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership?.workspace_id) {
    return { error: "Workspace not found." };
  }

  return { membership, userClient };
}

const getTabela = (entidade: string | null) => {
  if (entidade === "deal") return "custom_fields_deal";
  return "custom_fields_lead";
};

export async function PATCH(
  request: Request,
  { params }: { params: { fieldId: string } }
) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const entidade = body?.entity ?? "lead";
  const tabela = getTabela(entidade);

  const updates: Record<string, unknown> = {};
  if (typeof body?.nome === "string") {
    updates.nome = body.nome.trim();
  }
  if (typeof body?.tipo === "string") {
    updates.tipo = body.tipo;
  }
  if (typeof body?.obrigatorio === "boolean") {
    updates.obrigatorio = body.obrigatorio;
  }
  if (Array.isArray(body?.opcoes)) {
    updates.opcoes = body.opcoes;
  }
  if (typeof body?.ordem === "number") {
    updates.ordem = body.ordem;
  }

  if (!Object.keys(updates).length) {
    return new Response("No changes provided", { status: 400 });
  }

  const { data, error: updateError } = await userClient
    .from(tabela)
    .update(updates)
    .eq("id", params.fieldId)
    .eq("workspace_id", membership.workspace_id)
    .select("id, nome, tipo, opcoes, obrigatorio, ordem, created_at")
    .maybeSingle();

  if (updateError) {
    return new Response(updateError.message, { status: 500 });
  }

  return Response.json({ field: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: { fieldId: string } }
) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entidade = searchParams.get("entity") ?? "lead";
  const tabela = getTabela(entidade);

  const { error: deleteError } = await userClient
    .from(tabela)
    .delete()
    .eq("id", params.fieldId)
    .eq("workspace_id", membership.workspace_id);

  if (deleteError) {
    return new Response(deleteError.message, { status: 500 });
  }

  return Response.json({ ok: true });
}
