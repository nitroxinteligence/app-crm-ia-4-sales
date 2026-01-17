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
  leadId: z.string().trim().min(1),
});

const updateSchema = z
  .object({
    nome: z.string().trim().min(1).optional(),
    telefone: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    empresa: z.string().trim().optional(),
    status: z.string().trim().optional(),
    canal_origem: z.string().trim().optional(),
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

// GET /api/leads/[leadId] - Obter lead específico
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await context.params;
  const parsedParams = paramsSchema.safeParse({ leadId });
  if (!parsedParams.success) {
    return badRequest("Invalid lead id.");
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

  const { data: lead, error } = await supabaseServer
    .from("leads")
    .select("*, lead_tags (tag_id, tags (id, nome, cor))")
    .eq("id", parsedParams.data.leadId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (error) {
    return serverError(error.message);
  }

  if (!lead) {
    return notFound("Lead not found.");
  }

  const tags = (lead as any)?.lead_tags
    ? (lead as any).lead_tags
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

  return Response.json({ ...lead, tags });
}

// PATCH /api/leads/[leadId] - Atualizar lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  const parsedParams = paramsSchema.safeParse({ leadId });
  if (!parsedParams.success) {
    return badRequest("Invalid lead id.");
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

  // Verify lead exists
  const { data: existingLead } = await supabaseServer
    .from("leads")
    .select("id, workspace_id")
    .eq("id", parsedParams.data.leadId)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();

  if (!existingLead) {
    return notFound("Lead not found.");
  }

  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) {
    return badRequest("No valid fields to update.");
  }

  const updateData: Record<string, any> = { ...parsed.data };
  updateData.updated_at = new Date().toISOString();

  const { data: updatedLead, error } = await supabaseServer
    .from("leads")
    .update(updateData)
    .eq("id", parsedParams.data.leadId)
    .eq("workspace_id", membership.workspace_id)
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return Response.json(updatedLead);
}

// DELETE /api/leads/[leadId] - Deletar lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  const parsedParams = paramsSchema.safeParse({ leadId });
  if (!parsedParams.success) {
    return badRequest("Invalid lead id.");
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
    .from("leads")
    .delete()
    .eq("id", parsedParams.data.leadId)
    .eq("workspace_id", membership.workspace_id);

  if (error) {
    return serverError(error.message);
  }

  return new Response(null, { status: 204 });
}
