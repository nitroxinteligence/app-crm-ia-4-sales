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
    contact_id: z.string().trim().optional(),
    stage_id: z.string().trim().optional(),
    pipeline_id: z.string().trim().optional(),
    owner_id: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/deals - Listar deals
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
        contact_id: searchParams.get("contact_id") ?? undefined,
        stage_id: searchParams.get("stage_id") ?? undefined,
        pipeline_id: searchParams.get("pipeline_id") ?? undefined,
        owner_id: searchParams.get("owner_id") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
        offset: searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) {
        return badRequest("Invalid query params.");
    }
    const {
        contact_id: contactId,
        stage_id: stageId,
        pipeline_id: pipelineId,
        owner_id: ownerId,
        limit,
        offset,
    } = parsed.data;

    // Build query
    let query = supabaseServer
        .from("deals")
        .select("*", { count: "exact" })
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    // Apply filters
    if (contactId) query = query.eq("contact_id", contactId);
    if (stageId) query = query.eq("stage_id", stageId);
    if (pipelineId) query = query.eq("pipeline_id", pipelineId);
    if (ownerId) query = query.eq("owner_id", ownerId);

    const { data: deals, error, count } = await query;

    if (error) {
        return serverError(error.message);
    }

    return Response.json({
        deals: deals || [],
        total: count || 0,
    });
}
