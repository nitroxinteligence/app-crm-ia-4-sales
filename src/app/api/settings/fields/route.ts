import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type EntidadeCampo = "lead" | "deal";

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

export async function GET(request: Request) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entidade = searchParams.get("entity") ?? "lead";
  const tabela = getTabela(entidade);

  const { data, error: fieldsError } = await userClient
    .from(tabela)
    .select("id, nome, tipo, opcoes, obrigatorio, ordem, created_at")
    .eq("workspace_id", membership.workspace_id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (fieldsError) {
    return new Response(fieldsError.message, { status: 500 });
  }

  return Response.json({ fields: data ?? [], entity: entidade });
}

export async function POST(request: Request) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const entidade = (body?.entity ?? "lead") as EntidadeCampo;
  const tabela = getTabela(entidade);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const tipo = typeof body?.tipo === "string" ? body.tipo : null;
  const obrigatorio = Boolean(body?.obrigatorio);
  const opcoes = Array.isArray(body?.opcoes) ? body.opcoes : null;

  if (!nome || !tipo) {
    return new Response("Invalid payload", { status: 400 });
  }

  const { data: ultimo } = await userClient
    .from(tabela)
    .select("ordem")
    .eq("workspace_id", membership.workspace_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ordem = (ultimo?.ordem ?? 0) + 1;

  const { data, error: insertError } = await userClient
    .from(tabela)
    .insert({
      workspace_id: membership.workspace_id,
      nome,
      tipo,
      obrigatorio,
      opcoes,
      ordem,
    })
    .select("id, nome, tipo, opcoes, obrigatorio, ordem, created_at")
    .maybeSingle();

  if (insertError) {
    return new Response(insertError.message, { status: 500 });
  }

  return Response.json({ field: data });
}
