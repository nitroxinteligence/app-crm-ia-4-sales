import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const entitySchema = z.enum(["lead", "deal"]);

const paramsSchema = z.object({
  fieldId: z.string().trim().min(1),
});

const updateSchema = z
  .object({
    entity: entitySchema.optional(),
    nome: z.string().trim().min(1).optional(),
    tipo: z.string().trim().min(1).optional(),
    obrigatorio: z.boolean().optional(),
    opcoes: z.array(z.unknown()).optional(),
    ordem: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).some((key) => key !== "entity"), {
    message: "No changes provided",
  });

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type MembershipResult =
  | { membership: { workspace_id: string }; userClient: ReturnType<typeof getUserClient> }
  | { error: { status: 400 | 401 | 500; message: string } };

async function getMembership(request: Request): Promise<MembershipResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: { status: 500, message: "Missing Supabase env vars." } };
  }
  const userClient = getUserClient(request);
  if (!userClient) {
    return { error: { status: 401, message: "Missing auth header." } };
  }
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return { error: { status: 401, message: "Invalid auth." } };
  }

  const { data: membership, error: membershipError } = await userClient
    .from("workspace_members")
    .select("id, workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership?.workspace_id) {
    return { error: { status: 400, message: "Workspace not found." } };
  }

  return { membership, userClient };
}

const getTabela = (entidade: string | null) => {
  if (entidade === "deal") return "custom_fields_deal";
  return "custom_fields_lead";
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ fieldId: string }> }
) {
  const { fieldId } = await context.params;
  const parsedParams = paramsSchema.safeParse({ fieldId });
  if (!parsedParams.success) {
    return badRequest("Invalid field id.");
  }

  const membershipResult = await getMembership(request);
  if ("error" in membershipResult) {
    if (membershipResult.error.status === 400) {
      return badRequest(membershipResult.error.message);
    }
    if (membershipResult.error.status === 401) {
      return unauthorized(membershipResult.error.message);
    }
    return serverError(membershipResult.error.message);
  }
  const { membership, userClient } = membershipResult;

  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }

  const entidade = parsed.data.entity ?? "lead";
  const tabela = getTabela(entidade);

  const updates: Record<string, unknown> = {};
  if (parsed.data.nome !== undefined) {
    updates.nome = parsed.data.nome;
  }
  if (parsed.data.tipo !== undefined) {
    updates.tipo = parsed.data.tipo;
  }
  if (parsed.data.obrigatorio !== undefined) {
    updates.obrigatorio = parsed.data.obrigatorio;
  }
  if (parsed.data.opcoes !== undefined) {
    updates.opcoes = parsed.data.opcoes;
  }
  if (parsed.data.ordem !== undefined) {
    updates.ordem = parsed.data.ordem;
  }

  const { data, error: updateError } = await userClient
    .from(tabela)
    .update(updates)
    .eq("id", fieldId)
    .eq("workspace_id", membership.workspace_id)
    .select("id, nome, tipo, opcoes, obrigatorio, ordem, created_at")
    .maybeSingle();

  if (updateError) {
    return serverError(updateError.message);
  }

  return Response.json({ field: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ fieldId: string }> }
) {
  const { fieldId } = await context.params;
  const parsedParams = paramsSchema.safeParse({ fieldId });
  if (!parsedParams.success) {
    return badRequest("Invalid field id.");
  }

  const membershipResult = await getMembership(request);
  if ("error" in membershipResult) {
    if (membershipResult.error.status === 400) {
      return badRequest(membershipResult.error.message);
    }
    if (membershipResult.error.status === 401) {
      return unauthorized(membershipResult.error.message);
    }
    return serverError(membershipResult.error.message);
  }
  const { membership, userClient } = membershipResult;

  const { searchParams } = new URL(request.url);
  const parsedQuery = entitySchema.safeParse(searchParams.get("entity") ?? "lead");
  if (!parsedQuery.success) {
    return badRequest("Invalid entity.");
  }
  const entidade = parsedQuery.data;
  const tabela = getTabela(entidade);

  const { error: deleteError } = await userClient
    .from(tabela)
    .delete()
    .eq("id", fieldId)
    .eq("workspace_id", membership.workspace_id);

  if (deleteError) {
    return serverError(deleteError.message);
  }

  return Response.json({ ok: true });
}
