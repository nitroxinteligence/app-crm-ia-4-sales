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
    .select("id, workspace_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership?.workspace_id) {
    return { error: "Workspace not found." };
  }

  return { membership, userClient };
}

export async function GET(request: Request) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const { data, error: settingsError } = await userClient
    .from("workspace_settings")
    .select("workspace_id, mascarar_viewer, retencao_dias")
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (settingsError) {
    return new Response(settingsError.message, { status: 500 });
  }

  return Response.json({
    settings: data ?? {
      workspace_id: membership.workspace_id,
      mascarar_viewer: true,
      retencao_dias: 365,
    },
  });
}

export async function PATCH(request: Request) {
  const { membership, userClient, error } = await getMembership(request);
  if (!membership || !userClient) {
    return new Response(error ?? "Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body?.mascarar_viewer === "boolean") {
    updates.mascarar_viewer = body.mascarar_viewer;
  }
  if (typeof body?.retencao_dias === "number") {
    updates.retencao_dias = body.retencao_dias;
  }

  if (!Object.keys(updates).length) {
    return new Response("No changes provided", { status: 400 });
  }

  const { data, error: updateError } = await userClient
    .from("workspace_settings")
    .upsert({
      workspace_id: membership.workspace_id,
      ...updates,
    })
    .select("workspace_id, mascarar_viewer, retencao_dias")
    .maybeSingle();

  if (updateError) {
    return new Response(updateError.message, { status: 500 });
  }

  return Response.json({ settings: data });
}
