import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const entitySchema = z.enum(["lead", "deal"]);

const createSchema = z.object({
  entity: entitySchema.optional(),
  nome: z.string().trim().min(1),
  tipo: z.string().trim().min(1),
  obrigatorio: z.boolean().optional(),
  opcoes: z.array(z.unknown()).optional(),
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
  | { membership: { workspace_id: string }; userClient: NonNullable<ReturnType<typeof getUserClient>> }
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

export async function GET(request: Request) {
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

  const { data, error: fieldsError } = await userClient
    .from(tabela)
    .select("id, nome, tipo, opcoes, obrigatorio, ordem, created_at")
    .eq("workspace_id", membership.workspace_id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (fieldsError) {
    return serverError(fieldsError.message);
  }

  return Response.json({ fields: data ?? [], entity: entidade });
}

export async function POST(request: Request) {
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

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) {
    return badRequest("Invalid payload.");
  }

  const entidade = parsed.data.entity ?? "lead";
  const tabela = getTabela(entidade);
  const { nome, tipo } = parsed.data;
  const obrigatorio = parsed.data.obrigatorio ?? false;
  const opcoes = parsed.data.opcoes ?? null;

  const { data: ultimo } = await userClient
    .from(tabela)
    .select("ordem")
    .eq("workspace_id", membership.workspace_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ordem = (ultimo?.ordem ?? 0) + 1;

  const { data, error: insertError } = await userClient
    .from(tabela)
    .insert({
      workspace_id: membership.workspace_id,
      nome,
      tipo,
      obrigatorio,
      opcoes,
      ordem,
    })
    .select("id, nome, tipo, opcoes, obrigatorio, ordem, created_at")
    .maybeSingle();

  if (insertError) {
    return serverError(insertError.message);
  }

  return Response.json({ field: data });
}
