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

// GET /api/pipeline/[pipelineId] - Obter pipeline específico com suas stages
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ pipelineId: string }> }
) {
    const { pipelineId } = await params;

    if (!supabaseUrl || !supabaseAnonKey) {
        return new Response("Missing Supabase env vars", { status: 500 });
    }

    // Autenticar via API Key ou JWT
    const workspaceId = await authenticateRequest(request);
    if (!workspaceId) {
        return new Response("Invalid auth", { status: 401 });
    }

    // Get pipeline
    const { data: pipeline, error: pipelineError } = await supabaseServer
        .from("pipelines")
        .select("*")
        .eq("id", pipelineId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

    if (pipelineError) {
        return new Response(pipelineError.message, { status: 500 });
    }

    if (!pipeline) {
        return new Response("Pipeline not found", { status: 404 });
    }

    // Get pipeline stages
    const { data: stages, error: stagesError } = await supabaseServer
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("ordem", { ascending: true });

    if (stagesError) {
        return new Response(stagesError.message, { status: 500 });
    }

    return Response.json({
        ...pipeline,
        stages: stages || [],
    });
}
