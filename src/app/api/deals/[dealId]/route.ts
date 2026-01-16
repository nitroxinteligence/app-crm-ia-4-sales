import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

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

// GET /api/deals/[dealId] - Obter deal específico
export async function GET(
    request: NextRequest,
    { params }: { params: { dealId: string } }
) {
    if (!supabaseUrl || !supabaseAnonKey) {
        return new Response("Missing Supabase env vars", { status: 500 });
    }

    const userClient = getUserClient(request);
    if (!userClient) {
        return new Response("Missing auth header", { status: 401 });
    }

    const {
        data: { user },
        error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
        return new Response("Invalid auth", { status: 401 });
    }

    const { data: membership } = await userClient
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership?.workspace_id) {
        return new Response("Workspace not found", { status: 400 });
    }

    const { data: deal, error } = await supabaseServer
        .from("deals")
        .select("*")
        .eq("id", params.dealId)
        .eq("workspace_id", membership.workspace_id)
        .maybeSingle();

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    if (!deal) {
        return new Response("Deal not found", { status: 404 });
    }

    return Response.json(deal);
}

// PATCH /api/deals/[dealId] - Atualizar deal
export async function PATCH(
    request: NextRequest,
    { params }: { params: { dealId: string } }
) {
    if (!supabaseUrl || !supabaseAnonKey) {
        return new Response("Missing Supabase env vars", { status: 500 });
    }

    const userClient = getUserClient(request);
    if (!userClient) {
        return new Response("Missing auth header", { status: 401 });
    }

    const {
        data: { user },
        error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
        return new Response("Invalid auth", { status: 401 });
    }

    const { data: membership } = await userClient
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership?.workspace_id) {
        return new Response("Workspace not found", { status: 400 });
    }

    // Verify deal exists and belongs to workspace
    const { data: existingDeal } = await supabaseServer
        .from("deals")
        .select("id, workspace_id")
        .eq("id", params.dealId)
        .eq("workspace_id", membership.workspace_id)
        .maybeSingle();

    if (!existingDeal) {
        return new Response("Deal not found", { status: 404 });
    }

    const body = await request.json();

    // Allowed fields to update
    const allowedFields = [
        "stage_id",
        "titulo",
        "valor",
        "moeda",
        "owner_id",
        "empresa",
        "pipeline_id",
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }

    if (Object.keys(updateData).length === 0) {
        return new Response("No valid fields to update", { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedDeal, error } = await supabaseServer
        .from("deals")
        .update(updateData)
        .eq("id", params.dealId)
        .eq("workspace_id", membership.workspace_id)
        .select()
        .single();

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return Response.json(updatedDeal);
}

// DELETE /api/deals/[dealId] - Deletar deal
export async function DELETE(
    request: NextRequest,
    { params }: { params: { dealId: string } }
) {
    if (!supabaseUrl || !supabaseAnonKey) {
        return new Response("Missing Supabase env vars", { status: 500 });
    }

    const userClient = getUserClient(request);
    if (!userClient) {
        return new Response("Missing auth header", { status: 401 });
    }

    const {
        data: { user },
        error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
        return new Response("Invalid auth", { status: 401 });
    }

    const { data: membership } = await userClient
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership?.workspace_id) {
        return new Response("Workspace not found", { status: 400 });
    }

    const { error } = await supabaseServer
        .from("deals")
        .delete()
        .eq("id", params.dealId)
        .eq("workspace_id", membership.workspace_id);

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return new Response(null, { status: 204 });
}
