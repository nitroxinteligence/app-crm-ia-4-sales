import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const createSchema = z.object({
    name: z.string().trim().min(1).optional(),
});

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
        .maybeSingle();

    if (!membership?.workspace_id) {
        return badRequest("Workspace not found.");
    }

    const parsed = await parseJsonBody(request, createSchema);
    if (!parsed.ok) {
        return badRequest("Invalid payload.");
    }
    const name = parsed.data.name ?? "API Key";

    // Gerar API key usando a função do banco
    const { data: keyData, error: generateError } = await userClient
        .rpc("generate_api_key")
        .single();

    if (generateError || !keyData) {
        return serverError("Failed to generate key");
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
        return serverError(insertError.message);
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
        .maybeSingle();

    if (!membership?.workspace_id) {
        return badRequest("Workspace not found.");
    }

    const { data: apiKeys, error } = await userClient
        .from("api_keys")
        .select("id, name, created_at, last_used_at, is_active")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false });

    if (error) {
        return serverError(error.message);
    }

    return Response.json({ api_keys: apiKeys || [] });
}
