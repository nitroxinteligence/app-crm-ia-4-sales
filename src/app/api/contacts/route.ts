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

// GET /api/contacts - Listar contacts
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
    const pipelineStageId = searchParams.get("pipeline_stage_id");
    const ownerId = searchParams.get("owner_id");
    const status = searchParams.get("status");
    const telefone = searchParams.get("telefone");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabaseServer
        .from("contacts")
        .select("*, contact_tags (tag_id, tags (id, nome, cor))", { count: "exact" })
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    // Apply filters
    if (pipelineStageId) query = query.eq("pipeline_stage_id", pipelineStageId);
    if (ownerId) query = query.eq("owner_id", ownerId);
    if (status) query = query.eq("status", status);
    if (telefone) query = query.eq("telefone", telefone);

    const { data: contacts, error, count } = await query;

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    const contactsWithTags = (contacts ?? []).map((contact: any) => {
        const tags = (contact.contact_tags ?? [])
            .map((item: any) => {
                const tag = Array.isArray(item.tags) ? item.tags[0] : item.tags;
                if (!tag?.id) return null;
                return {
                    id: tag.id,
                    nome: tag.nome,
                    cor: tag.cor ?? null,
                };
            })
            .filter(Boolean);
        return { ...contact, tags };
    });

    return Response.json({
        contacts: contactsWithTags,
        total: count || 0,
    });
}

// POST /api/contacts - Criar contact
export async function POST(request: NextRequest) {
    if (!supabaseUrl || !supabaseAnonKey) {
        return new Response("Missing Supabase env vars", { status: 500 });
    }

    // Autenticar via API Key ou JWT
    const workspaceId = await authenticateRequest(request);
    if (!workspaceId) {
        return new Response("Invalid auth", { status: 401 });
    }

    const body = await request.json();

    if (!body.nome) {
        return new Response("Nome is required", { status: 400 });
    }

    const contactData: Record<string, any> = {
        workspace_id: workspaceId,
        nome: body.nome,
        telefone: body.telefone || null,
        email: body.email || null,
        empresa: body.empresa || null,
        status: body.status || "novo",
        owner_id: body.owner_id || null,
    };

    // Optional fields
    if (body.pipeline_id) contactData.pipeline_id = body.pipeline_id;
    if (body.pipeline_stage_id)
        contactData.pipeline_stage_id = body.pipeline_stage_id;

    const { data: contact, error } = await supabaseServer
        .from("contacts")
        .insert(contactData)
        .select()
        .single();

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return Response.json(contact, { status: 201 });
}
