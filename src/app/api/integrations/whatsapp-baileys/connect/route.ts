import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizarPlano, planosConfig } from "@/lib/planos";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const baileysApiUrl = process.env.BAILEYS_API_URL ?? "";
const baileysApiKey = process.env.BAILEYS_API_KEY ?? "";

const PROVIDER_BAILEYS = "whatsapp_baileys";

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
    return new Response("Missing Supabase env vars", { status: 500 });
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return new Response("Missing auth header", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const workspaceId =
    body && typeof body === "object" && "workspaceId" in body
      ? String((body as { workspaceId?: string }).workspaceId ?? "")
      : "";
  const accountIdRequest =
    body && typeof body === "object" && "integrationAccountId" in body
      ? String(
          (body as { integrationAccountId?: string }).integrationAccountId ?? ""
        )
      : "";
  const forceNew =
    body && typeof body === "object" && "forceNew" in body
      ? Boolean((body as { forceNew?: boolean }).forceNew)
      : false;

  if (!workspaceId) {
    return new Response("Missing workspaceId", { status: 400 });
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: workspace } = await supabaseServer
    .from("workspaces")
    .select("id, plano, trial_ends_at")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!workspace) {
    return new Response("Workspace nao encontrado", { status: 404 });
  }

  if (isTrialExpired(workspace.trial_ends_at ?? undefined)) {
    return new Response("Trial expirado.", { status: 402 });
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
      return new Response("Limite de canais atingido para o seu plano.", {
        status: 409,
      });
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
    return new Response("Falha ao salvar integracao.", { status: 500 });
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
      return new Response("Falha ao criar conta da API não oficial.", {
        status: 500,
      });
    }

    integrationAccountId = newAccount.id;
  }

  await supabaseServer
    .from("integration_accounts")
    .update({ status: "conectando" })
    .eq("id", integrationAccountId);

  if (!baileysApiUrl) {
    return new Response("Missing BAILEYS_API_URL", { status: 500 });
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
    return new Response("Falha ao acessar a API do Baileys.", {
      status: 502,
    });
  }

  if (!response.ok) {
    const detalhe = await response.text().catch(() => "");
    return new Response(
      detalhe || "Falha ao iniciar sessão da API não oficial.",
      {
        status: 502,
      }
    );
  }

  const payload = await response.json();
  return Response.json({
    integrationAccountId,
    status: payload?.status ?? "conectando",
    qrcode: payload?.qrcode ?? null,
  });
}
