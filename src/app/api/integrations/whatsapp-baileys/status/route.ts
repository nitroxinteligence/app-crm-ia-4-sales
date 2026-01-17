import { createClient } from "@supabase/supabase-js";
import {
  badRequest,
  forbidden,
  serverError,
  unauthorized,
} from "@/lib/api/responses";
import { getEnv } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const PROVIDER_BAILEYS = "whatsapp_baileys";
const PROVIDER_LEGADO = "whatsapp_nao_oficial";

type IntegrationAccountStatus = {
  id: string;
  provider?: string | null;
  [key: string]: unknown;
};

function getUserClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return serverError("Missing Supabase env vars");
  }

  const userClient = getUserClient(request);
  if (!userClient) {
    return unauthorized("Missing auth header");
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return badRequest("Missing workspaceId");
  }

  const { data: membership } = await userClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!membership) {
    return forbidden("Forbidden");
  }

  const accountSelectBase =
    "id, provider, nome, numero, status, connected_at, instance_id, identificador, created_at, sync_status, sync_total, sync_done, sync_started_at, sync_finished_at, sync_last_error";
  const accountSelectWithChats = `${accountSelectBase}, sync_total_chats, sync_done_chats`;

  const { data: integration } = await supabaseServer
    .from("integrations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("canal", "whatsapp")
    .maybeSingle();

  let accounts: IntegrationAccountStatus[] | null = null;
  const providerFiltro = `provider.is.null,provider.in.(${PROVIDER_BAILEYS},${PROVIDER_LEGADO})`;

  const buscarContaPorIntegration = async () => {
    if (!integration?.id) return [];
    const { data, error } = await supabaseServer
      .from("integration_accounts")
      .select(accountSelectWithChats)
      .eq("integration_id", integration.id)
      .or(providerFiltro)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!error && data) return data;
    const fallback = await supabaseServer
      .from("integration_accounts")
      .select(accountSelectBase)
      .eq("integration_id", integration.id)
      .or(providerFiltro)
      .order("created_at", { ascending: false })
      .limit(1);
    if (fallback.error) {
      console.warn(
        "Baileys status fallback select error:",
        fallback.error.message
      );
    }
    return fallback.data ?? [];
  };

  const buscarContaPorId = async (id: string) => {
    const { data, error } = await supabaseServer
      .from("integration_accounts")
      .select(accountSelectWithChats)
      .eq("id", id)
      .maybeSingle();
    if (!error && data) return data;
    const fallback = await supabaseServer
      .from("integration_accounts")
      .select(accountSelectBase)
      .eq("id", id)
      .maybeSingle();
    if (fallback.error) {
      console.warn(
        "Baileys status account fallback error:",
        fallback.error.message
      );
    }
    return fallback.data ?? null;
  };

  accounts = await buscarContaPorIntegration();

  if (!accounts || accounts.length === 0) {
    const { data: sessions } = await supabaseServer
      .from("whatsapp_baileys_sessions")
      .select("integration_account_id")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(1);

    const sessionAccountId = sessions?.[0]?.integration_account_id ?? null;
    if (sessionAccountId) {
      const account = await buscarContaPorId(sessionAccountId);
      accounts = account ? [account] : [];
    }
  }

  if (!accounts || accounts.length === 0) {
    const { data: conversations } = await supabaseServer
      .from("conversations")
      .select("integration_account_id")
      .eq("workspace_id", workspaceId)
      .eq("canal", "whatsapp")
      .not("integration_account_id", "is", null)
      .order("ultima_mensagem_em", { ascending: false })
      .limit(1);
    const conversationAccountId =
      conversations?.[0]?.integration_account_id ?? null;
    if (conversationAccountId) {
      const account = await buscarContaPorId(conversationAccountId);
      accounts = account ? [account] : [];
    }
  }

  const legadoIds =
    accounts
      ?.filter(
        (account) =>
          account.provider === PROVIDER_LEGADO || account.provider == null
      )
      .map((account) => account.id) ?? [];

  if (legadoIds.length > 0) {
    await supabaseServer
      .from("integration_accounts")
      .update({ provider: PROVIDER_BAILEYS })
      .in("id", legadoIds);
  }

  return Response.json({
    accounts: accounts ?? [],
  });
}
