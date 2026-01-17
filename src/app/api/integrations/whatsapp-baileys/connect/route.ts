import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  badRequest,
  badGateway,
  conflict,
  forbidden,
  notFound,
  paymentRequired,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizarPlano, planosConfig } from "@/lib/planos";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const baileysApiUrl = getEnv("BAILEYS_API_URL");
const baileysApiKey = getEnv("BAILEYS_API_KEY");

const PROVIDER_BAILEYS = "whatsapp_baileys";

const payloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  integrationAccountId: z.string().trim().min(1).optional(),
  forceNew: z.boolean().optional(),
});

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const isTrialExpired = (trialEndsAt?: string | null) => {
  if (!trialEndsAt) return false;
  const endsAt = new Date(trialEndsAt).getTime();
  if (Number.isNaN(endsAt)) return false;
  return Date.now() > endsAt;
};

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return serverError("Missing Supabase env vars");
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return unauthorized("Missing auth header");
  }

  const parsed = await parseJsonBody(request, payloadSchema);
  if (!parsed.ok) {
    return badRequest("Missing workspaceId");
  }
  const {
    workspaceId,
    integrationAccountId: accountIdRequest,
    forceNew = false,
  } = parsed.data;

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    return forbidden("Forbidden");
  }

  const { data: workspace } = await supabaseServer
    .from("workspaces")
    .select("id, plano, trial_ends_at")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!workspace) {
    return notFound("Workspace nao encontrado");
  }

  if (isTrialExpired(workspace.trial_ends_at ?? undefined)) {
    return paymentRequired("Trial expirado.");
  }

  const plano = normalizarPlano(workspace.plano);
  const limiteCanais = planosConfig[plano].canais ?? 0;
  if (limiteCanais > 0 && limiteCanais < 999) {
    const { data: contasAtivas } = await supabaseServer
      .from("integration_accounts")
      .select("id, integrations!inner(canal, workspace_id), status")
      .eq("integrations.workspace_id", workspaceId)
      .eq("status", "conectado")
      .in("integrations.canal", ["whatsapp", "instagram"]);

    const totalAtivo = (contasAtivas ?? []).length;
    if (totalAtivo >= limiteCanais) {
      return conflict("Limite de canais atingido para o seu plano.");
    }
  }

  const { data: integration } = await supabaseServer
    .from("integrations")
    .upsert(
      {
        workspace_id: workspaceId,
        canal: "whatsapp",
        status: "conectado",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,canal" }
    )
    .select("id")
    .single();

  if (!integration) {
    return serverError("Falha ao salvar integracao.");
  }

  let integrationAccountId: string | null = null;

  if (accountIdRequest) {
    const { data: existingRequested } = await supabaseServer
      .from("integration_accounts")
      .select("id")
      .eq("id", accountIdRequest)
      .eq("integration_id", integration.id)
      .eq("provider", PROVIDER_BAILEYS)
      .maybeSingle();

    if (existingRequested?.id) {
      integrationAccountId = existingRequested.id;
    }
  }

  if (!integrationAccountId && !forceNew) {
    const { data: existingAccount } = await supabaseServer
      .from("integration_accounts")
      .select("id")
      .eq("integration_id", integration.id)
      .eq("provider", PROVIDER_BAILEYS)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAccount?.id) {
      integrationAccountId = existingAccount.id;
    }
  }

  if (!integrationAccountId) {
    const { data: newAccount } = await supabaseServer
      .from("integration_accounts")
      .insert({
        integration_id: integration.id,
        nome: "WhatsApp (API não oficial)",
        provider: PROVIDER_BAILEYS,
        status: "conectando",
      })
      .select("id")
      .single();

    if (!newAccount?.id) {
      return serverError("Falha ao criar conta da API não oficial.");
    }

    integrationAccountId = newAccount.id;
  }

  await supabaseServer
    .from("integration_accounts")
    .update({ status: "conectando" })
    .eq("id", integrationAccountId);

  if (!baileysApiUrl) {
    return serverError("Missing BAILEYS_API_URL");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (baileysApiKey) {
    headers["X-API-KEY"] = baileysApiKey;
  }

  let response: Response;
  try {
    response = await fetch(`${baileysApiUrl}/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        integrationAccountId,
        workspaceId,
        forceNew,
      }),
    });
  } catch (error) {
    console.error("Baileys connect fetch failed:", error);
    return badGateway("Falha ao acessar a API do Baileys.");
  }

  if (!response.ok) {
    const detalhe = await response.text().catch(() => "");
    return badGateway(detalhe || "Falha ao iniciar sessão da API não oficial.");
  }

  const payload = await response.json();
  return Response.json({
    integrationAccountId,
    status: payload?.status ?? "conectando",
    qrcode: payload?.qrcode ?? null,
  });
}
