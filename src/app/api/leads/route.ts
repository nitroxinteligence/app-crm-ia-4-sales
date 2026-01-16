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

// GET /api/leads - Listar leads
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
    const status = searchParams.get("status");
    const canalOrigem = searchParams.get("canal_origem");
    const ownerId = searchParams.get("owner_id");
    const telefone = searchParams.get("telefone"); // Filtro por telefone
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabaseServer
        .from("leads")
        .select("*, lead_tags (tag_id, tags (id, nome, cor))", { count: "exact" })
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    // Apply filters
    if (status) query = query.eq("status", status);
    if (canalOrigem) query = query.eq("canal_origem", canalOrigem);
    if (ownerId) query = query.eq("owner_id", ownerId);
    if (telefone) query = query.eq("telefone", telefone); // Filtrar por telefone exato

    const { data: leads, error, count } = await query;

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    const leadsWithTags = (leads ?? []).map((lead: any) => {
        const tags = (lead.lead_tags ?? [])
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
        return { ...lead, tags };
    });

    return Response.json({
        leads: leadsWithTags,
        total: count || 0,
    });
}

// POST /api/leads - Criar lead
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const leadData: Record<string, any> = {
        workspace_id: membership.workspace_id,
        nome: body.nome || null,
        telefone: body.telefone || null,
        email: body.email || null,
        empresa: body.empresa || null,
        canal_origem: body.canal_origem || "whatsapp",
        status: body.status || "novo",
        owner_id: body.owner_id || user.id,
    };

    const { data: lead, error } = await supabaseServer
        .from("leads")
        .insert(leadData)
        .select()
        .single();

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return Response.json(lead, { status: 201 });
}
