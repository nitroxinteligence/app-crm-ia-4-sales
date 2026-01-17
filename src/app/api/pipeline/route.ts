import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { serverError, unauthorized } from "@/lib/api/responses";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// GET /api/pipeline - Listar pipelines
export async function GET(request: NextRequest) {
    if (!supabaseUrl || !supabaseAnonKey) {
        return serverError("Missing Supabase env vars.");
    }

    // Autenticar via API Key ou JWT
    const workspaceId = await authenticateRequest(request);
    if (!workspaceId) {
        return unauthorized("Invalid auth.");
    }

    const { data: pipelines, error } = await supabaseServer
        .from("pipelines")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });

    if (error) {
        return serverError(error.message);
    }

    return Response.json({
        pipelines: pipelines || [],
        total: pipelines?.length || 0,
    });
}
