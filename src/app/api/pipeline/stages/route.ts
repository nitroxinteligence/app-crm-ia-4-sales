import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const querySchema = z.object({
    pipeline_id: z.string().trim().optional(),
});

// GET /api/pipeline/stages - Listar estágios de pipeline
export async function GET(request: NextRequest) {
    if (!supabaseUrl || !supabaseAnonKey) {
        return serverError("Missing Supabase env vars.");
    }

    // Autenticar via API Key ou JWT
    const workspaceId = await authenticateRequest(request);
    if (!workspaceId) {
        return unauthorized("Invalid auth.");
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
        pipeline_id: searchParams.get("pipeline_id") ?? undefined,
    });
    if (!parsed.success) {
        return badRequest("Invalid query params.");
    }
    const { pipeline_id: pipelineId } = parsed.data;

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
        return serverError(error.message);
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
