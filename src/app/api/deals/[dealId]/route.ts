import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const paramsSchema = z.object({
    dealId: z.string().trim().min(1),
});

const updateSchema = z
    .object({
        stage_id: z.string().trim().optional(),
        titulo: z.string().trim().optional(),
        valor: z.union([z.number(), z.string()]).optional(),
        moeda: z.string().trim().optional(),
        owner_id: z.string().trim().optional(),
        empresa: z.string().trim().optional(),
        pipeline_id: z.string().trim().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "No valid fields to update",
    });

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
    { params }: { params: Promise<{ dealId: string }> }
) {
    const { dealId } = await params;
    const parsedParams = paramsSchema.safeParse({ dealId });
    if (!parsedParams.success) {
        return badRequest("Invalid deal id.");
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

    const { data: deal, error } = await supabaseServer
        .from("deals")
        .select("*")
        .eq("id", parsedParams.data.dealId)
        .eq("workspace_id", membership.workspace_id)
        .maybeSingle();

    if (error) {
        return serverError(error.message);
    }

    if (!deal) {
        return notFound("Deal not found.");
    }

    return Response.json(deal);
}

// PATCH /api/deals/[dealId] - Atualizar deal
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ dealId: string }> }
) {
    const { dealId } = await params;
    const parsedParams = paramsSchema.safeParse({ dealId });
    if (!parsedParams.success) {
        return badRequest("Invalid deal id.");
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

    // Verify deal exists and belongs to workspace
    const { data: existingDeal } = await supabaseServer
        .from("deals")
        .select("id, workspace_id")
        .eq("id", parsedParams.data.dealId)
        .eq("workspace_id", membership.workspace_id)
        .maybeSingle();

    if (!existingDeal) {
        return notFound("Deal not found.");
    }

    const parsed = await parseJsonBody(request, updateSchema);
    if (!parsed.ok) {
        return badRequest("No valid fields to update.");
    }

    const updateData: Record<string, any> = { ...parsed.data };

    updateData.updated_at = new Date().toISOString();

    const { data: updatedDeal, error } = await supabaseServer
        .from("deals")
        .update(updateData)
        .eq("id", parsedParams.data.dealId)
        .eq("workspace_id", membership.workspace_id)
        .select()
        .single();

    if (error) {
        return serverError(error.message);
    }

    return Response.json(updatedDeal);
}

// DELETE /api/deals/[dealId] - Deletar deal
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ dealId: string }> }
) {
    const { dealId } = await params;
    const parsedParams = paramsSchema.safeParse({ dealId });
    if (!parsedParams.success) {
        return badRequest("Invalid deal id.");
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

    const { error } = await supabaseServer
        .from("deals")
        .delete()
        .eq("id", parsedParams.data.dealId)
        .eq("workspace_id", membership.workspace_id);

    if (error) {
        return serverError(error.message);
    }

    return new Response(null, { status: 204 });
}
