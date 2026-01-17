import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { getEnv } from "@/lib/config";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

/**
 * Valida API Key e retorna workspace_id
 */
export async function validateApiKey(apiKey: string): Promise<string | null> {
    const { data, error } = await supabaseServer
        .from("api_keys")
        .select("workspace_id, id")
        .eq("key", apiKey)
        .eq("is_active", true)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    // Atualizar last_used_at de forma assíncrona (não bloqueia a resposta)
    supabaseServer
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", data.id)
        .then(() => { }, () => { });

    return data.workspace_id;
}

/**
 * Valida JWT Bearer token e retorna user_id e workspace_id
 */
export async function validateJwtToken(request: NextRequest): Promise<{
    userId: string;
    workspaceId: string;
} | null> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
        data: { user },
        error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
        return null;
    }

    const { data: membership } = await userClient
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership?.workspace_id) {
        return null;
    }

    return {
        userId: user.id,
        workspaceId: membership.workspace_id,
    };
}

/**
 * Autentica requisição via API Key ou JWT
 * Retorna workspace_id se autenticado, null caso contrário
 */
export async function authenticateRequest(
    request: NextRequest
): Promise<string | null> {
    // Tentar API Key primeiro (prioridade para integrações)
    const apiKey = request.headers.get("X-API-Key");
    if (apiKey) {
        return await validateApiKey(apiKey);
    }

    // Fallback para JWT Bearer token (frontend)
    const jwtAuth = await validateJwtToken(request);
    return jwtAuth?.workspaceId ?? null;
}
