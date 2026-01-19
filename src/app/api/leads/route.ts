import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { badRequest, conflict, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const querySchema = z.object({
  status: z.string().trim().optional(),
  canal_origem: z.string().trim().optional(),
  owner_id: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const createSchema = z.object({
  nome: z.string().trim().min(1).optional(),
  telefone: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  empresa: z.string().trim().optional(),
  canal_origem: z.string().trim().optional(),
  status: z.string().trim().optional(),
  owner_id: z.string().trim().optional(),
});

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
    status: searchParams.get("status") ?? undefined,
    canal_origem: searchParams.get("canal_origem") ?? undefined,
    owner_id: searchParams.get("owner_id") ?? undefined,
    telefone: searchParams.get("telefone") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });
  if (!parsed.success) {
    return badRequest("Invalid query params.");
  }
  const { status, canal_origem: canalOrigem, owner_id: ownerId, telefone, limit, offset } =
    parsed.data;

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
    return serverError(error.message);
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

  const { data: workspace } = await supabaseServer
    .from("workspaces")
    .select("trial_ends_at, plano_selected_at")
    .eq("id", membership.workspace_id)
    .maybeSingle();

  const trialEndsAt = workspace?.trial_ends_at
    ? Date.parse(workspace.trial_ends_at)
    : null;
  const trialExpirado =
    trialEndsAt !== null && !Number.isNaN(trialEndsAt) && trialEndsAt < Date.now();

  if (trialExpirado && !workspace?.plano_selected_at) {
    return conflict("Trial encerrado. Selecione um plano para continuar.");
  }

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }

  const leadData: Record<string, any> = {
    workspace_id: membership.workspace_id,
    nome: parsed.data.nome ?? null,
    telefone: parsed.data.telefone ?? null,
    email: parsed.data.email ?? null,
    empresa: parsed.data.empresa ?? null,
    canal_origem: parsed.data.canal_origem ?? "whatsapp",
    status: parsed.data.status ?? "novo",
    owner_id: parsed.data.owner_id ?? user.id,
  };

  const { data: lead, error } = await supabaseServer
    .from("leads")
    .insert(leadData)
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return Response.json(lead, { status: 201 });
}
