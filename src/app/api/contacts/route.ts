import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const querySchema = z.object({
    pipeline_stage_id: z.string().trim().optional(),
    owner_id: z.string().trim().optional(),
    status: z.string().trim().optional(),
    telefone: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

const createSchema = z.object({
    nome: z.string().trim().min(1),
    telefone: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    empresa: z.string().trim().optional(),
    status: z.string().trim().optional(),
    owner_id: z.string().trim().optional(),
    pipeline_id: z.string().trim().optional(),
    pipeline_stage_id: z.string().trim().optional(),
});

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
        return serverError("Missing Supabase env vars");
    }

    // Autenticar via API Key ou JWT
    const workspaceId = await authenticateRequest(request);
    if (!workspaceId) {
        return unauthorized("Invalid auth");
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
        pipeline_stage_id: searchParams.get("pipeline_stage_id") ?? undefined,
        owner_id: searchParams.get("owner_id") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        telefone: searchParams.get("telefone") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
        offset: searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) {
        return badRequest("Invalid query params");
    }
    const { pipeline_stage_id: pipelineStageId, owner_id: ownerId, status, telefone, limit, offset } =
        parsed.data;

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
        return serverError(error.message);
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
        return serverError("Missing Supabase env vars");
    }

    // Autenticar via API Key ou JWT
    const workspaceId = await authenticateRequest(request);
    if (!workspaceId) {
        return unauthorized("Invalid auth");
    }

    let parsed;
    try {
        parsed = createSchema.parse(await request.json());
    } catch {
        return badRequest("Nome is required");
    }

    const contactData: Record<string, any> = {
        workspace_id: workspaceId,
        nome: parsed.nome,
        telefone: parsed.telefone || null,
        email: parsed.email || null,
        empresa: parsed.empresa || null,
        status: parsed.status || "novo",
        owner_id: parsed.owner_id || null,
    };

    // Optional fields
    if (parsed.pipeline_id) contactData.pipeline_id = parsed.pipeline_id;
    if (parsed.pipeline_stage_id)
        contactData.pipeline_stage_id = parsed.pipeline_stage_id;

    const { data: contact, error } = await supabaseServer
        .from("contacts")
        .insert(contactData)
        .select()
        .single();

    if (error) {
        return serverError(error.message);
    }

    return Response.json(contact, { status: 201 });
}
