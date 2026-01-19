import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  badRequest,
  forbidden,
  conflict,
  paymentRequired,
  serverError,
  unauthorized,
  unprocessableEntity,
} from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getEnv } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { planosConfig, resolverPlanoEfetivo } from "@/lib/planos";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const appId = getEnv("WHATSAPP_APP_ID");
const appSecret = getEnv("WHATSAPP_APP_SECRET");
const graphVersion = getEnv("WHATSAPP_GRAPH_VERSION", "v20.0");

const payloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  code: z.string().trim().min(1).optional(),
  redirectUri: z.string().trim().min(1).optional(),
  accessToken: z.string().trim().min(1).optional(),
  phoneNumberId: z.string().trim().min(1).optional(),
  wabaId: z.string().trim().min(1).optional(),
});

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function graphGet(
  path: string,
  params: Record<string, string>
): Promise<unknown> {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${path}`);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph error: ${errorText}`);
  }
  return response.json();
}

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type WabaResponse = {
  data?: Array<{ id?: string; name?: string }>;
};

type PhoneNumberResponse = {
  data?: Array<{ id?: string; display_phone_number?: string }>;
};

type BusinessResponse = {
  data?: Array<{ id?: string; name?: string }>;
};

type SubscribeResponse = {
  success?: boolean;
};

async function exchangeCodeForToken(code: string, redirectUri?: string) {
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code,
  });

  if (redirectUri) {
    params.set("redirect_uri", redirectUri);
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const token = (await response.json()) as TokenResponse;
  if (!token.access_token) {
    throw new Error("Missing access_token in exchange response");
  }

  const longLivedParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: token.access_token,
  });

  const longResponse = await fetch(
    `https://graph.facebook.com/${graphVersion}/oauth/access_token?${longLivedParams.toString()}`
  );

  if (!longResponse.ok) {
    return token;
  }

  const longToken = (await longResponse.json()) as TokenResponse;
  return longToken.access_token ? longToken : token;
}

async function listWabasFromUser(accessToken: string) {
  try {
    const wabaResponse = (await graphGet("me/whatsapp_business_accounts", {
      access_token: accessToken,
    })) as WabaResponse;
    return wabaResponse.data ?? [];
  } catch {
    return [];
  }
}

async function listBusinesses(accessToken: string) {
  const businessResponse = (await graphGet("me/businesses", {
    access_token: accessToken,
  })) as BusinessResponse;
  return businessResponse.data ?? [];
}

async function listWabasForBusiness(accessToken: string, businessId: string) {
  const ownedResponse = (await graphGet(
    `${businessId}/owned_whatsapp_business_accounts`,
    { access_token: accessToken }
  )) as WabaResponse;

  if (ownedResponse.data?.length) {
    return ownedResponse.data;
  }

  const clientResponse = (await graphGet(
    `${businessId}/client_whatsapp_business_accounts`,
    { access_token: accessToken }
  )) as WabaResponse;

  return clientResponse.data ?? [];
}

async function resolveWabaAndPhone(accessToken: string) {
  const directWabas = await listWabasFromUser(accessToken);
  let wabaId = directWabas[0]?.id ?? null;
  let businessId: string | null = null;

  if (!wabaId) {
    const businesses = await listBusinesses(accessToken);
    for (const business of businesses) {
      if (!business.id) continue;
      const wabas = await listWabasForBusiness(accessToken, business.id);
      if (wabas[0]?.id) {
        wabaId = wabas[0].id ?? null;
        businessId = business.id ?? null;
        break;
      }
    }
  }

  if (!wabaId) {
    return { wabaId: null, phoneNumberId: null, businessId: null, displayPhoneNumber: null };
  }

  const phoneResponse = (await graphGet(`${wabaId}/phone_numbers`, {
    access_token: accessToken,
  })) as PhoneNumberResponse;

  const phoneNumberId = phoneResponse.data?.[0]?.id ?? null;
  const displayPhoneNumber = phoneResponse.data?.[0]?.display_phone_number ?? null;

  return { wabaId, phoneNumberId, businessId, displayPhoneNumber };
}

async function subscribeWaba(accessToken: string, wabaId: string) {
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${wabaId}/subscribed_apps`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken }).toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Subscribe failed: ${errorText}`);
  }

  const data = (await response.json()) as SubscribeResponse;
  if (!data.success) {
    throw new Error("Subscribe failed: response not successful");
  }
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return serverError("Missing Supabase env vars");
    }

    if (!appId || !appSecret) {
      return serverError("Missing WhatsApp app env vars");
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
      code,
      redirectUri,
      accessToken: accessTokenFromClient,
      phoneNumberId: phoneNumberIdFromClient,
      wabaId: wabaIdFromClient,
    } = parsed.data;

    const { data: membership } = await userClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!membership) {
      return forbidden("Forbidden");
    }

    const { data: workspace } = await supabaseServer
      .from("workspaces")
      .select("id, plano, trial_ends_at, plano_selected_at, trial_plano")
      .eq("id", workspaceId)
      .maybeSingle();

    if (!workspace) {
      return forbidden("Workspace nao encontrado.");
    }

    if (workspace.trial_ends_at && !workspace.plano_selected_at) {
      const trialEndsAt = new Date(workspace.trial_ends_at).getTime();
      if (trialEndsAt < Date.now()) {
        return paymentRequired("Trial expirado.");
      }
    }

    const planoEfetivo = resolverPlanoEfetivo(workspace);
    const limiteCanais = planosConfig[planoEfetivo].canais ?? 0;
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

    let tokenResponse: TokenResponse | null = null;
    let accessToken = accessTokenFromClient ?? null;

    if (!accessToken && code) {
      tokenResponse = await exchangeCodeForToken(code, redirectUri);
      accessToken = tokenResponse.access_token ?? null;
    }

    if (!accessToken) {
      return badRequest("Missing access token");
    }

    let resolved: {
      wabaId: string | null;
      phoneNumberId: string | null;
      businessId: string | null;
      displayPhoneNumber: string | null;
    } = {
      wabaId: null,
      phoneNumberId: null,
      businessId: null,
      displayPhoneNumber: null,
    };

    if (!phoneNumberIdFromClient || !wabaIdFromClient) {
      try {
        resolved = await resolveWabaAndPhone(accessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Missing Permission")) {
          return forbidden(
            "Missing Permission: conceda business_management e whatsapp_business_management ou informe o Phone Number ID manualmente."
          );
        }
        throw error;
      }
    }

    const phoneNumberId = phoneNumberIdFromClient ?? resolved.phoneNumberId;
    const wabaId = wabaIdFromClient ?? resolved.wabaId;
    const businessId = resolved.businessId ?? null;
    const displayPhoneNumber = resolved.displayPhoneNumber ?? null;

    if (!phoneNumberId) {
      return unprocessableEntity("Missing phone_number_id");
    }

    if (wabaId) {
      await subscribeWaba(accessToken, wabaId);
    }

    const expiresIn = tokenResponse?.expires_in;
    const expiraEm = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const { data: integration, error: integrationError } = await supabaseServer
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

    if (integrationError || !integration) {
      return serverError(
        integrationError?.message ?? "Failed to save integration"
      );
    }

    const { data: existingAccount } = await supabaseServer
      .from("integration_accounts")
      .select("id")
      .eq("integration_id", integration.id)
      .maybeSingle();

    const accountPayload = {
      integration_id: integration.id,
      nome: "WhatsApp Business",
      identificador: phoneNumberId,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      business_account_id: businessId ?? wabaId,
      provider: "whatsapp_oficial",
      numero: displayPhoneNumber ?? phoneNumberId,
      status: "conectado",
      connected_at: new Date().toISOString(),
    };

    const accountResult = existingAccount
      ? await supabaseServer
          .from("integration_accounts")
          .update(accountPayload)
          .eq("id", existingAccount.id)
          .select("id")
          .single()
      : await supabaseServer
          .from("integration_accounts")
          .insert(accountPayload)
          .select("id")
          .single();

    if (accountResult.error) {
      return serverError(accountResult.error.message);
    }

    const accountId = existingAccount?.id ?? accountResult.data?.id ?? null;
    const { data: existingToken } = await supabaseServer
      .from("integration_tokens")
      .select("id")
      .eq("integration_id", integration.id)
      .maybeSingle();

    const tokenPayload = {
      integration_id: integration.id,
      integration_account_id: accountId,
      access_token: accessToken,
      refresh_token: null,
      expira_em: expiraEm,
    };

    const tokenResult = existingToken
      ? await supabaseServer
          .from("integration_tokens")
          .update(tokenPayload)
          .eq("id", existingToken.id)
      : await supabaseServer.from("integration_tokens").insert(tokenPayload);

    if (tokenResult.error) {
      return serverError(tokenResult.error.message);
    }

    const { data: authData } = await userClient.auth.getUser();
    const actorId = authData?.user?.id ?? null;
    const actorType = actorId ? "user" : "system";

    const { error: eventError } = await supabaseServer.from("events").insert({
      workspace_id: workspaceId,
      event_type: "integrations.whatsapp.connected",
      entity_type: "integration",
      entity_id: integration.id,
      actor_type: actorType,
      actor_id: actorId,
      canal: "whatsapp",
      payload_minimo: {
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        business_account_id: businessId,
      },
      occurred_at: new Date().toISOString(),
    });

    if (eventError) {
      console.error("Failed to log event:", eventError.message);
    }

    return Response.json({
      connected: true,
      integrationId: integration.id,
      phoneNumberId,
      wabaId,
      businessId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("WhatsApp connect failed:", message);
    return serverError(message);
  }
}
