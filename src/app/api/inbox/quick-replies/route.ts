import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type QuickReplyPayload = {
  titulo?: string;
  atalho?: string;
  conteudo?: string;
  id?: string;
};

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getMembership(userClient: any, userId: string) {
  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .maybeSingle();
  return membership;
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response("Missing Supabase env vars.", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header.", { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response("Invalid auth.", { status: 401 });
  }

  const membership = await getMembership(userClient, user.id);
  if (!membership?.workspace_id) {
    return new Response("Workspace not found.", { status: 400 });
  }

  const { data, error } = await userClient
    .from("quick_replies")
    .select("id, titulo, atalho, conteudo")
    .eq("workspace_id", membership.workspace_id)
    .order("titulo", { ascending: true });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return Response.json({ quickReplies: data ?? [] });
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response("Missing Supabase env vars.", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header.", { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response("Invalid auth.", { status: 401 });
  }

  const membership = await getMembership(userClient, user.id);
  if (!membership?.workspace_id) {
    return new Response("Workspace not found.", { status: 400 });
  }

  const body = (await request.json()) as QuickReplyPayload;
  const titulo = body?.titulo?.trim();
  const conteudo = body?.conteudo?.trim();
  const atalho = body?.atalho?.trim() || null;

  if (!titulo || !conteudo) {
    return new Response("Invalid payload.", { status: 400 });
  }

  const { data, error } = await userClient
    .from("quick_replies")
    .insert({
      workspace_id: membership.workspace_id,
      titulo,
      atalho,
      conteudo,
    })
    .select("id, titulo, atalho, conteudo")
    .single();

  if (error || !data) {
    return new Response(error?.message ?? "Failed to create quick reply.", {
      status: 500,
    });
  }

  return Response.json({ quickReply: data });
}

export async function DELETE(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response("Missing Supabase env vars.", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header.", { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response("Invalid auth.", { status: 401 });
  }

  const membership = await getMembership(userClient, user.id);
  if (!membership?.workspace_id) {
    return new Response("Workspace not found.", { status: 400 });
  }

  const body = (await request.json()) as QuickReplyPayload;
  const id = body?.id?.trim();
  if (!id) {
    return new Response("Invalid payload.", { status: 400 });
  }

  const { error } = await userClient
    .from("quick_replies")
    .delete()
    .eq("workspace_id", membership.workspace_id)
    .eq("id", id);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
