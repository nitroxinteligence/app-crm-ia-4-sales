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
const appId = getEnv("INSTAGRAM_APP_ID") || getEnv("WHATSAPP_APP_ID");
const appSecret =
  getEnv("INSTAGRAM_APP_SECRET") || getEnv("WHATSAPP_APP_SECRET");
const graphVersion =
  getEnv("INSTAGRAM_GRAPH_VERSION") ||
  getEnv("WHATSAPP_GRAPH_VERSION") ||
  "v20.0";

const payloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  code: z.string().trim().min(1).optional(),
  redirectUri: z.string().trim().min(1).optional(),
  accessToken: z.string().trim().min(1).optional(),
  instagramAccountId: z.string().trim().min(1).optional(),
  pageId: z.string().trim().min(1).optional(),
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

type InstagramAccount = {
  id?: string;
  username?: string;
};

type PageAccount = {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: InstagramAccount;
  connected_instagram_account?: InstagramAccount;
};

type PageResponse = {
  data?: PageAccount[];
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

async function listPages(accessToken: string): Promise<PageAccount[]> {
  const response = (await graphGet("me/accounts", {
    access_token: accessToken,
    fields:
      "id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}",
  })) as PageResponse;
  return response.data ?? [];
}

async function resolveInstagramAccount(
  accessToken: string,
  instagramAccountId?: string | null,
  pageId?: string | null
) {
  const pages = await listPages(accessToken);
  const matchesInstagram = (page: PageAccount) => {
    const ig =
      page.instagram_business_account ?? page.connected_instagram_account;
    return ig?.id && ig.id === instagramAccountId;
  };
  const selected =
    (pageId ? pages.find((page) => page.id === pageId) : undefined) ??
    (instagramAccountId ? pages.find(matchesInstagram) : undefined) ??
    pages.find(
      (page) =>
        page.instagram_business_account?.id ||
        page.connected_instagram_account?.id
    );

  if (!selected?.id) {
    return null;
  }

  const instagram =
    selected.instagram_business_account ?? selected.connected_instagram_account;
  if (!instagram?.id) {
    return null;
  }

  let username = instagram.username ?? null;
  if (!username) {
    try {
      const details = (await graphGet(instagram.id, {
        access_token: accessToken,
        fields: "id,username",
      })) as InstagramAccount;
      username = details.username ?? null;
    } catch {
      username = null;
    }
  }

  return {
    pageId: selected.id,
    pageName: selected.name ?? "Instagram",
    pageAccessToken: selected.access_token ?? accessToken,
    instagramId: instagram.id,
    instagramUsername: username ?? "Instagram",
  };
}

async function subscribePage(accessToken: string, pageId: string) {
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${pageId}/subscribed_apps`,
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
  if (data.success === false) {
    throw new Error("Subscribe failed: response not successful");
  }
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return serverError("Missing Supabase env vars");
    }

    if (!appId || !appSecret) {
      return serverError("Missing Instagram app env vars");
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
      instagramAccountId,
      pageId,
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

    const resolved = await resolveInstagramAccount(
      accessToken,
      instagramAccountId,
      pageId
    );

    if (!resolved) {
      return unprocessableEntity(
        "Nao foi possivel encontrar uma conta Instagram conectada."
      );
    }

    if (resolved.pageId) {
      await subscribePage(resolved.pageAccessToken, resolved.pageId);
    }

    const { data: integration, error: integrationError } = await supabaseServer
      .from("integrations")
      .upsert(
        {
          workspace_id: workspaceId,
          canal: "instagram",
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
      nome: resolved.instagramUsername,
      identificador: resolved.instagramId,
      responsavel: resolved.pageName,
      provider: "instagram",
      numero: resolved.instagramId,
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

    const expiresIn = tokenResponse?.expires_in;
    const expiraEm = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const tokenPayload = {
      integration_id: integration.id,
      integration_account_id: accountId,
      access_token: resolved.pageAccessToken,
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
      event_type: "integrations.instagram.connected",
      entity_type: "integration",
      entity_id: integration.id,
      actor_type: actorType,
      actor_id: actorId,
      canal: "instagram",
      payload_minimo: {
        instagram_id: resolved.instagramId,
        page_id: resolved.pageId,
      },
      occurred_at: new Date().toISOString(),
    });

    if (eventError) {
      console.error("Failed to log event:", eventError.message);
    }

    return Response.json({
      connected: true,
      integrationId: integration.id,
      instagramId: resolved.instagramId,
      pageId: resolved.pageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Instagram connect failed:", message);
    return serverError(message);
  }
}
