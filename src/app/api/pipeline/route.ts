import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";

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

// GET /api/pipeline - Listar pipelines
export async function GET(request: NextRequest) {
    if (!supabaseUrl || !supabaseAnonKey) {
        return new Response("Missing Supabase env vars", { status: 500 });
    }

    // Autenticar via API Key ou JWT
    const workspaceId = await authenticateRequest(request);
    if (!workspaceId) {
        return new Response("Invalid auth", { status: 401 });
    }

    const { data: pipelines, error } = await supabaseServer
        .from("pipelines")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return Response.json({
        pipelines: pipelines || [],
        total: pipelines?.length || 0,
    });
}
