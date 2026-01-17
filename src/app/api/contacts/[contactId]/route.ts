import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import {
    badRequest,
    notFound,
    serverError,
    unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const updateSchema = z
    .object({
        nome: z.string().trim().min(1).optional(),
        telefone: z.string().trim().optional(),
        email: z.string().trim().email().optional(),
        empresa: z.string().trim().optional(),
        status: z.string().trim().optional(),
        pipeline_id: z.string().trim().optional(),
        pipeline_stage_id: z.string().trim().optional(),
        owner_id: z.string().trim().nullable().optional(),
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

// GET /api/contacts/[contactId] - Obter contact específico
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ contactId: string }> }
) {
    const { contactId } = await context.params;
    if (!supabaseUrl || !supabaseAnonKey) {
        return serverError("Missing Supabase env vars");
    }

    const userClient = getUserClient(request);
    if (!userClient) {
        return unauthorized("Missing auth header");
    }

    const {
        data: { user },
        error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
        return unauthorized("Invalid auth");
    }

    const { data: membership } = await userClient
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership?.workspace_id) {
        return badRequest("Workspace not found");
    }

    const { data: contact, error } = await supabaseServer
        .from("contacts")
        .select("*, contact_tags (tag_id, tags (id, nome, cor))")
        .eq("id", contactId)
        .eq("workspace_id", membership.workspace_id)
        .maybeSingle();

    if (error) {
        return serverError(error.message);
    }

    if (!contact) {
        return notFound("Contact not found");
    }

    const tags = (contact as any)?.contact_tags
        ? (contact as any).contact_tags
            .map((item: any) => {
                const tag = Array.isArray(item.tags) ? item.tags[0] : item.tags;
                if (!tag?.id) return null;
                return {
                    id: tag.id,
                    nome: tag.nome,
                    cor: tag.cor ?? null,
                };
            })
            .filter(Boolean)
        : [];

    return Response.json({ ...contact, tags });
}

// PATCH /api/contacts/[contactId] - Atualizar contact
export async function PATCH(
    request: NextRequest,
    { params }: { params: { contactId: string } }
) {
    if (!supabaseUrl || !supabaseAnonKey) {
        return serverError("Missing Supabase env vars");
    }

    const userClient = getUserClient(request);
    if (!userClient) {
        return unauthorized("Missing auth header");
    }

    const {
        data: { user },
        error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
        return unauthorized("Invalid auth");
    }

    const { data: membership } = await userClient
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership?.workspace_id) {
        return badRequest("Workspace not found");
    }

    // Verify contact exists and belongs to workspace
    const { data: existingContact } = await supabaseServer
        .from("contacts")
        .select("id, workspace_id")
        .eq("id", params.contactId)
        .eq("workspace_id", membership.workspace_id)
        .maybeSingle();

    if (!existingContact) {
        return notFound("Contact not found");
    }

    const parsed = await parseJsonBody(request, updateSchema);
    if (!parsed.ok) {
        return badRequest("No valid fields to update");
    }
    const updateData: Record<string, any> = { ...parsed.data };

    updateData.updated_at = new Date().toISOString();

    const { data: updatedContact, error } = await supabaseServer
        .from("contacts")
        .update(updateData)
        .eq("id", params.contactId)
        .eq("workspace_id", membership.workspace_id)
        .select()
        .single();

    if (error) {
        return serverError(error.message);
    }

    return Response.json(updatedContact);
}

// DELETE /api/contacts/[contactId] - Deletar contact
export async function DELETE(
    request: NextRequest,
    { params }: { params: { contactId: string } }
) {
    if (!supabaseUrl || !supabaseAnonKey) {
        return serverError("Missing Supabase env vars");
    }

    const userClient = getUserClient(request);
    if (!userClient) {
        return unauthorized("Missing auth header");
    }

    const {
        data: { user },
        error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
        return unauthorized("Invalid auth");
    }

    const { data: membership } = await userClient
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership?.workspace_id) {
        return badRequest("Workspace not found");
    }

    const { error } = await supabaseServer
        .from("contacts")
        .delete()
        .eq("id", params.contactId)
        .eq("workspace_id", membership.workspace_id);

    if (error) {
        return serverError(error.message);
    }

    return new Response(null, { status: 204 });
}
