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

// GET /api/deals - Listar deals
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
    const contactId = searchParams.get("contact_id");
    const stageId = searchParams.get("stage_id");
    const pipelineId = searchParams.get("pipeline_id");
    const ownerId = searchParams.get("owner_id");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

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
        return new Response(error.message, { status: 500 });
    }

    return Response.json({
        deals: deals || [],
        total: count || 0,
    });
}
