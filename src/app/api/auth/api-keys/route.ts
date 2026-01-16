import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getUserClient(request: NextRequest) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return null;
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

// POST /api/auth/api-keys - Criar nova API Key
export async function POST(request: NextRequest) {
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
        .maybeSingle();

    if (!membership?.workspace_id) {
        return new Response("Workspace not found", { status: 400 });
    }

    const body = await request.json();
    const name = body.name || "API Key";

    // Gerar API key usando a função do banco
    const { data: keyData, error: generateError } = await userClient
        .rpc("generate_api_key")
        .single();

    if (generateError || !keyData) {
        return new Response("Failed to generate key", { status: 500 });
    }

    // Criar registro da API key
    const { data: apiKey, error: insertError } = await userClient
        .from("api_keys")
        .insert({
            workspace_id: membership.workspace_id,
            key: keyData,
            name,
        })
        .select()
        .single();

    if (insertError) {
        return new Response(insertError.message, { status: 500 });
    }

    return Response.json({
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        created_at: apiKey.created_at,
    });
}

// GET /api/auth/api-keys - Listar API Keys do workspace
export async function GET(request: NextRequest) {
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
        .maybeSingle();

    if (!membership?.workspace_id) {
        return new Response("Workspace not found", { status: 400 });
    }

    const { data: apiKeys, error } = await userClient
        .from("api_keys")
        .select("id, name, created_at, last_used_at, is_active")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false });

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return Response.json({ api_keys: apiKeys || [] });
}
