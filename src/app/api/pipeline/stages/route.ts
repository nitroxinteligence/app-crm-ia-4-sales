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

// GET /api/pipeline/stages - Listar estágios de pipeline
export async function GET(request: NextRequest) {
    if (!supabaseUrl || !supabaseAnonKey) {
        return new Response("Missing Supabase env vars", { status: 500 });
    }

    // Autenticar via API Key ou JWT
    const workspaceId = await authenticateRequest(request);
    if (!workspaceId) {
        return new Response("Invalid auth", { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get("pipeline_id");

    // Build query - get stages from pipelines in this workspace
    let query = supabaseServer
        .from("pipeline_stages")
        .select("*, pipeline:pipelines!inner(workspace_id)")
        .eq("pipeline.workspace_id", workspaceId)
        .order("ordem", { ascending: true });

    // Apply filter by pipeline_id if provided
    if (pipelineId) {
        query = query.eq("pipeline_id", pipelineId);
    }

    const { data: stages, error } = await query;

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    // Remove the nested pipeline object from response
    const cleanedStages = stages?.map((stage: any) => {
        const { pipeline, ...rest } = stage;
        return rest;
    });

    return Response.json({
        stages: cleanedStages || [],
        total: cleanedStages?.length || 0,
    });
}
