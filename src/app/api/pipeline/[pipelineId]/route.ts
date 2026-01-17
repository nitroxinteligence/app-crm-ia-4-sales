import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
    badRequest,
    notFound,
    serverError,
    unauthorized,
} from "@/lib/api/responses";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const paramsSchema = z.object({
    pipelineId: z.string().trim().min(1),
});

// GET /api/pipeline/[pipelineId] - Obter pipeline específico com suas stages
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ pipelineId: string }> }
) {
    const { pipelineId } = await params;
    const parsedParams = paramsSchema.safeParse({ pipelineId });
    if (!parsedParams.success) {
        return badRequest("Invalid pipeline id.");
    }

    if (!supabaseUrl || !supabaseAnonKey) {
        return serverError("Missing Supabase env vars.");
    }

    // Autenticar via API Key ou JWT
    const workspaceId = await authenticateRequest(request);
    if (!workspaceId) {
        return unauthorized("Invalid auth.");
    }

    // Get pipeline
    const { data: pipeline, error: pipelineError } = await supabaseServer
        .from("pipelines")
        .select("*")
        .eq("id", parsedParams.data.pipelineId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

    if (pipelineError) {
        return serverError(pipelineError.message);
    }

    if (!pipeline) {
        return notFound("Pipeline not found.");
    }

    // Get pipeline stages
    const { data: stages, error: stagesError } = await supabaseServer
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", parsedParams.data.pipelineId)
        .order("ordem", { ascending: true });

    if (stagesError) {
        return serverError(stagesError.message);
    }

    return Response.json({
        ...pipeline,
        stages: stages || [],
    });
}
