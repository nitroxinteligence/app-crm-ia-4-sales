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

async function getUser(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: "Missing Supabase env vars." };
  }
  const userClient = getUserClient(request);
  if (!userClient) {
    return { user: null, error: "Missing auth header." };
  }
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return { user: null, error: "Invalid auth." };
  }
  return { user, userClient };
}

export async function GET(request: Request) {
  const { user, userClient, error } = await getUser(request);
  if (!user || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const { data, error: profileError } = await userClient
    .from("profiles")
    .select("user_id, nome, email, avatar_url, idioma")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return new Response(profileError.message, { status: 500 });
  }

  return Response.json({ profile: data });
}

export async function PATCH(request: Request) {
  const { user, userClient, error } = await getUser(request);
  if (!user || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const nome = typeof body?.nome === "string" ? body.nome.trim() : null;
  const avatarUrlRaw = body?.avatarUrl;
  const avatarUrl =
    typeof avatarUrlRaw === "string" ? avatarUrlRaw.trim() : null;
  const idioma = typeof body?.idioma === "string" ? body.idioma.trim() : null;

  const updates: Record<string, string | null> = {};
  if (nome) updates.nome = nome;
  if ("avatarUrl" in body) updates.avatar_url = avatarUrl || null;
  if (idioma) updates.idioma = idioma;

  if (!Object.keys(updates).length) {
    return new Response("No changes provided", { status: 400 });
  }

  const { data, error: updateError } = await userClient
    .from("profiles")
    .update(updates)
    .eq("user_id", user.id)
    .select("user_id, nome, email, avatar_url, idioma")
    .maybeSingle();

  if (updateError) {
    return new Response(updateError.message, { status: 500 });
  }

  return Response.json({ profile: data });
}
