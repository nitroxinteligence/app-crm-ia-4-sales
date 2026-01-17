import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const paramsSchema = z.object({
    keyId: z.string().trim().min(1),
});

function getUserClient(request: NextRequest) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return null;
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

// DELETE /api/auth/api-keys/[keyId] - Revogar API Key
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ keyId: string }> }
) {
    const { keyId } = await params;
    const parsedParams = paramsSchema.safeParse({ keyId });
    if (!parsedParams.success) {
        return badRequest("Invalid api key id.");
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

    const { data: membership } = await userClient
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership?.workspace_id) {
        return badRequest("Workspace not found.");
    }

    // Deletar apenas se pertencer ao workspace do usuário
    const { error } = await userClient
        .from("api_keys")
        .delete()
        .eq("id", parsedParams.data.keyId)
        .eq("workspace_id", membership.workspace_id);

    if (error) {
        return serverError(error.message);
    }

    return Response.json({ success: true });
}
