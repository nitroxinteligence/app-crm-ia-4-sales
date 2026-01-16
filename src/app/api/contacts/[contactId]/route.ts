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

// GET /api/contacts/[contactId] - Obter contact específico
export async function GET(
    request: NextRequest,
    { params }: { params: { contactId: string } }
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

    const { data: contact, error } = await supabaseServer
        .from("contacts")
        .select("*, contact_tags (tag_id, tags (id, nome, cor))")
        .eq("id", params.contactId)
        .eq("workspace_id", membership.workspace_id)
        .maybeSingle();

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    if (!contact) {
        return new Response("Contact not found", { status: 404 });
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

    // Verify contact exists and belongs to workspace
    const { data: existingContact } = await supabaseServer
        .from("contacts")
        .select("id, workspace_id")
        .eq("id", params.contactId)
        .eq("workspace_id", membership.workspace_id)
        .maybeSingle();

    if (!existingContact) {
        return new Response("Contact not found", { status: 404 });
    }

    const body = await request.json();

    // Allowed fields to update
    const allowedFields = [
        "nome",
        "telefone",
        "email",
        "empresa",
        "status",
        "pipeline_id",
        "pipeline_stage_id",
        "owner_id",
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

    const { data: updatedContact, error } = await supabaseServer
        .from("contacts")
        .update(updateData)
        .eq("id", params.contactId)
        .eq("workspace_id", membership.workspace_id)
        .select()
        .single();

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return Response.json(updatedContact);
}

// DELETE /api/contacts/[contactId] - Deletar contact
export async function DELETE(
    request: NextRequest,
    { params }: { params: { contactId: string } }
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
        .from("contacts")
        .delete()
        .eq("id", params.contactId)
        .eq("workspace_id", membership.workspace_id);

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return new Response(null, { status: 204 });
}
