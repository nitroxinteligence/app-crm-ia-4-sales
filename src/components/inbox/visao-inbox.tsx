"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  CanalId,
  ContatoInbox,
  ConversaInbox,
  MensagemInbox,
  StatusConversa,
} from "@/lib/types";
import type Pusher from "pusher-js";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { conversationChannel, workspaceChannel } from "@/lib/pusher/channels";
import { createPusherClient } from "@/lib/pusher/client";
import type {
  PusherAttachmentPayload,
  PusherConversationUpdatedPayload,
  PusherMessagePayload,
  PusherTagsUpdatedPayload,
} from "@/lib/pusher/types";
import { ListaConversas } from "@/components/inbox/lista-conversas";
import { ChatConversa } from "@/components/inbox/chat-conversa";
import { PainelContato } from "@/components/inbox/painel-contato";
import { Skeleton } from "@/components/ui/skeleton";

const LIMITE_CONVERSAS = 20;
const LIMITE_MENSAGENS = 20;

const formatarHorario = (valor?: string | null) => {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizarAutor = (
  autor?: string | null
): "contato" | "equipe" | "agente" => {
  if (autor === "equipe" || autor === "agente") return autor;
  return "contato";
};

const isNomeGenerico = (nome?: string | null) => {
  if (!nome) return true;
  const normalizado = nome.trim().toLowerCase();
  return (
    normalizado === "lead sem nome" ||
    normalizado === "contato sem nome" ||
    normalizado === "unknown"
  );
};

const isNumeroGrupo = (valor?: string | null) => {
  if (!valor) return false;
  if (valor.includes("@g.us")) return true;
  const somenteDigitos = valor.replace(/\D/g, "");
  return somenteDigitos.length > 16;
};

export function VisaoInbox() {
  const { session } = useAutenticacao();
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [conversas, setConversas] = React.useState<ConversaInbox[]>([]);
  const [contagens, setContagens] = React.useState({
    naoIniciados: 0,
    aguardando: 0,
    emAberto: 0,
    agentes: 0,
    finalizadas: 0,
    spam: 0,
  });

  const resetarContagens = React.useCallback(() => {
    setContagens({
      naoIniciados: 0,
      aguardando: 0,
      emAberto: 0,
      agentes: 0,
      finalizadas: 0,
      spam: 0,
    });
  }, []);

  const verificarWhatsappConectado = React.useCallback(async () => {
    if (!workspaceId) return true;
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) return true;
      const response = await fetch(
        `/api/integrations/whatsapp-baileys/status?workspaceId=${workspaceId}`,
        { headers: { Authorization: `Bearer ${data.session.access_token}` } }
      );
      if (!response.ok) return true;
      const payload = (await response.json()) as {
        accounts?: Array<{ status?: string | null }>;
      };
      const contas = payload.accounts ?? [];
      if (contas.length === 0) return true;
      return contas.some((conta) => conta.status === "conectado");
    } catch {
      return true;
    }
  }, [workspaceId]);

  const carregarContagem = React.useCallback(async () => {
    if (!workspaceId) return;
    const whatsappConectado = await verificarWhatsappConectado();
    if (!whatsappConectado) {
      resetarContagens();
      return;
    }

    const count = async (filter: object, notFilter?: object) => {
      let query = supabaseClient
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);
      Object.entries(filter).forEach(([key, value]) => {
        if (value === null) query = query.is(key, null);
        else query = query.eq(key, value);
      });
      if (notFilter) {
        Object.entries(notFilter).forEach(([key, value]) => {
          if (value === "IS NOT NULL") query = query.not(key, "is", null);
          else query = query.neq(key, value);
        });
      }
      const { count } = await query;
      return count ?? 0;
    };

    const [pendente, resolvida, spam, agentes, abertasComUltima] =
      await Promise.all([
        count({ status: "pendente" }),
        count({ status: "resolvida" }),
        count({ status: "spam" }),
        count({ status: "aberta" }, { owner_id: "IS NOT NULL" }),
        supabaseClient
          .from("conversations")
          .select("id, messages:messages(autor, created_at)")
          .eq("workspace_id", workspaceId)
          .eq("status", "aberta")
          .order("created_at", { foreignTable: "messages", ascending: false })
          .limit(1, { foreignTable: "messages" }),
      ]);

    const abertasData = abertasComUltima.data ?? [];
    const aguardando = abertasData.filter(
      (conversa) => conversa.messages?.[0]?.autor === "contato"
    ).length;
    const emAberto = Math.max(0, abertasData.length - aguardando);

    setContagens({
      naoIniciados: pendente,
      aguardando,
      emAberto,
      finalizadas: resolvida,
      spam: spam,
      agentes: agentes,
    });
  }, [resetarContagens, verificarWhatsappConectado, workspaceId]);

  React.useEffect(() => {
    const timer = setTimeout(() => void carregarContagem(), 1000);
    const interval = setInterval(() => void carregarContagem(), 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [carregarContagem]);
  const [membrosEquipe, setMembrosEquipe] = React.useState<
    Array<{ id: string; userId: string; nome: string; avatarUrl?: string | null }>
  >([]);
  const [carregando, setCarregando] = React.useState(true);
  const [statusAtual, setStatusAtual] = React.useState<StatusConversa>("aberta");
  const [busca, setBusca] = React.useState("");
  const [filtroCanal, setFiltroCanal] = React.useState<CanalId | "todos">(
    "todos"
  );
  const [ordenacaoConversas, setOrdenacaoConversas] = React.useState<
    "recentes" | "antigas"
  >("recentes");
  const [filtroBasico, setFiltroBasico] = React.useState<
    | "tudo"
    | "nao-lidos"
    | "meus"
    | "seguindo"
    | "pendente"
    | "nao-atribuido"
    | "atribuido"
    | "sem-tags"
    | "nunca-respondidos"
    | "tag"
    | "canal"
    | "em-aberto"
    | "finalizadas"
    | "spam"
    | "nao-iniciados"
  >("tudo");
  const [filtroAtribuicao, setFiltroAtribuicao] = React.useState<
    "todos" | "nao-atribuido" | "atribuido"
  >("todos");
  const [filtroTag, setFiltroTag] = React.useState<string | null>(null);
  const [filtroSemTags, setFiltroSemTags] = React.useState(false);
  const [filtroOwner, setFiltroOwner] = React.useState("todos");
  const [filtroNumero, setFiltroNumero] = React.useState("todos");
  const [somenteNaoLidas, setSomenteNaoLidas] = React.useState(false);
  const [ocultarGrupos, setOcultarGrupos] = React.useState(false);
  const [paginaConversas, setPaginaConversas] = React.useState(0);
  const [conversasHasMais, setConversasHasMais] = React.useState(true);
  const [selecionadaId, setSelecionadaId] = React.useState<string | null>(null);
  const [colapsadaContato, setColapsadaContato] = React.useState(true);
  const refreshTimerRef = React.useRef<number | null>(null);
  const pusherRef = React.useRef<Pusher | null>(null);
  const pusherEventCacheRef = React.useRef<{
    set: Set<string>;
    order: string[];
  }>({ set: new Set(), order: [] });

  const shouldProcessEvent = React.useCallback((eventId?: string | null) => {
    if (!eventId) return true;
    const cache = pusherEventCacheRef.current;
    if (cache.set.has(eventId)) return false;
    cache.set.add(eventId);
    cache.order.push(eventId);
    if (cache.order.length > 200) {
      const old = cache.order.shift();
      if (old) {
        cache.set.delete(old);
      }
    }
    return true;
  }, []);

  const logRealtimeLatency = React.useCallback(
    (eventId: string | undefined, emittedAt?: string) => {
      if (!emittedAt) return;
      const emittedMs = Date.parse(emittedAt);
      if (!Number.isFinite(emittedMs)) return;
      const latencyMs = Date.now() - emittedMs;
      if (latencyMs > 1000) {
        console.warn("Pusher latency high", {
          eventId,
          latencyMs,
        });
      }
    },
    []
  );



  React.useEffect(() => {
    if (!session) {
      setWorkspaceId(null);
      return;
    }

    supabaseClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setWorkspaceId(data?.workspace_id ?? null);
      });
  }, [session]);

  React.useEffect(() => {
    if (!session?.access_token) {
      setMembrosEquipe([]);
      return;
    }

    const controller = new AbortController();
    const carregar = async () => {
      const response = await fetch("/api/settings/team", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        members?: Array<{
          id: string;
          userId: string;
          nome: string;
          avatarUrl?: string | null;
        }>;
      };
      setMembrosEquipe(payload.members ?? []);
    };

    carregar().catch((error) => {
      // Ignorar erros de abort quando o componente desmonta
      if (error.name === 'AbortError') return;
      console.error('Erro ao carregar membros da equipe:', error);
    });
    return () => controller.abort();
  }, [session?.access_token]);

  const carregarConversas = React.useCallback(async (options?: {
    silencioso?: boolean;
    pagina?: number;
    substituir?: boolean;
  }) => {
    if (!workspaceId) return;
    const paginaAtual = options?.pagina ?? 0;
    if (!options?.silencioso && paginaAtual === 0) {
      setCarregando(true);
    }

    const baseSelect =
      "id, status, canal, owner_id, modo_atendimento_humano, ultima_mensagem, ultima_mensagem_em, lead_id, contact_id, integration_account_id";
    const contactFieldList = [
      "id",
      "nome",
      "telefone",
      "email",
      "avatar_url",
      "empresa",
      "site",
      "data_nascimento",
    ];
    const contactFieldsFallback = ["id", "nome", "telefone", "email", "empresa"].join(", ");
    type LeadResumo = {
      id: string;
      nome?: string | null;
      telefone?: string | null;
      email?: string | null;
      avatar_url?: string | null;
      whatsapp_wa_id?: string | null;
    };
    type AccountResumo = {
      id: string;
      numero?: string | null;
      nome?: string | null;
      provider?: string | null;
      identificador?: string | null;
      phone_number_id?: string | null;
      avatar_url?: string | null;
    };
    type ContactResumo = {
      id: string;
      nome?: string | null;
      telefone?: string | null;
      email?: string | null;
      avatar_url?: string | null;
      empresa?: string | null;
      site?: string | null;
      documento?: string | null;
      data_nascimento?: string | null;
    };
    type TagResumo = {
      nome?: string | null;
    };
    type LeadTagRegistro = {
      lead_id?: string | null;
      tags?: TagResumo | TagResumo[] | null;
    };
    type ContactTagRegistro = {
      contact_id?: string | null;
      tags?: TagResumo | TagResumo[] | null;
    };
    type QueryListResponse<T> = {
      data: T[] | null;
      error?: { message?: string } | null;
    };
    const vazio: QueryListResponse<never> = { data: [], error: null };
    type ConversaRegistro = {
      id: string;
      status: StatusConversa;
      canal: CanalId;
      owner_id?: string | null;
      modo_atendimento_humano?: boolean | null;
      ultima_mensagem?: string | null;
      ultima_mensagem_em?: string | null;
      lead_id?: string | null;
      contact_id?: string | null;
      integration_account_id?: string | null;
      leads?: LeadResumo | null;
      contacts?: ContactResumo | null;
      integration_accounts?: AccountResumo | null;
    };
    let data: ConversaRegistro[] | null = null;
    let query = supabaseClient
      .from("conversations")
      .select(baseSelect)
      .eq("workspace_id", workspaceId);

    if (["nao-iniciados", "pendente"].includes(filtroBasico)) {
      query = query.eq("status", "pendente");
    } else if (filtroBasico === "em-aberto") {
      query = query.eq("status", "aberta");
    } else if (filtroBasico === "finalizadas") {
      query = query.eq("status", "resolvida");
    } else if (filtroBasico === "spam") {
      query = query.eq("status", "spam");
    } else {
      query = query.eq("status", statusAtual);
    }

    if (filtroCanal !== "todos") query = query.eq("canal", filtroCanal);
    if (filtroOwner !== "todos") query = query.eq("owner_id", filtroOwner);
    if (filtroNumero !== "todos") query = query.eq("integration_account_id", filtroNumero);

    const full = await query
      .order("ultima_mensagem_em", { ascending: false })
      .range(
        paginaAtual * LIMITE_CONVERSAS,
        paginaAtual * LIMITE_CONVERSAS + LIMITE_CONVERSAS - 1
      );

    if (full.error) {
      console.error("Inbox select error:", full.error?.message);
      setCarregando(false);
      return;
    } else {
      data = full.data ?? [];
    }

    const leadIds = Array.from(
      new Set((data ?? []).map((item) => item.lead_id).filter(Boolean))
    ) as string[];
    const contactIds = Array.from(
      new Set((data ?? []).map((item) => item.contact_id).filter(Boolean))
    ) as string[];
    const accountIds = Array.from(
      new Set(
        (data ?? []).map((item) => item.integration_account_id).filter(Boolean)
      )
    ) as string[];

    const [leadResponse, accountResponse, contactResponse] = await Promise.all([
      leadIds.length
        ? supabaseClient
          .from("leads")
          .select("id, nome, telefone, email, avatar_url")
          .in("id", leadIds)
        : Promise.resolve(vazio),
      accountIds.length
        ? supabaseClient
          .from("integration_accounts")
          .select(
            "id, numero, nome, provider, identificador, phone_number_id, avatar_url"
          )
          .in("id", accountIds)
        : Promise.resolve(vazio),
      contactIds.length
        ? supabaseClient
          .from("contacts")
          .select(
            "id, nome, telefone, email, avatar_url, empresa, site, documento, data_nascimento"
          )
          .in("id", contactIds)
        : Promise.resolve(vazio),
    ]) as [
        QueryListResponse<LeadResumo>,
        QueryListResponse<AccountResumo>,
        QueryListResponse<ContactResumo>,
      ];

    let leads: LeadResumo[] = leadResponse.data ?? [];
    if (leadResponse.error?.message?.includes("avatar_url") && leadIds.length) {
      const fallbackLeads = await supabaseClient
        .from("leads")
        .select("id, nome, telefone, email")
        .in("id", leadIds);
      if (!fallbackLeads.error && fallbackLeads.data) {
        leads = (fallbackLeads.data ?? []) as LeadResumo[];
      }
    } else if (leadResponse.error) {
      console.error("Inbox leads error:", leadResponse.error.message);
    }
    let accounts: AccountResumo[] = accountResponse.data ?? [];
    if (accountResponse.error?.message?.includes("avatar_url") && accountIds.length) {
      const fallbackAccounts = await supabaseClient
        .from("integration_accounts")
        .select("id, numero, nome, provider, identificador, phone_number_id")
        .in("id", accountIds);
      if (!fallbackAccounts.error && fallbackAccounts.data) {
        accounts = (fallbackAccounts.data ?? []) as AccountResumo[];
      }
    } else if (accountResponse.error) {
      console.error("Inbox accounts error:", accountResponse.error.message);
    }
    let contacts: ContactResumo[] = contactResponse.data ?? [];
    if (contactIds.length && contactResponse.error) {
      const errorMessage = contactResponse.error.message ?? "";
      const missingMatches = Array.from(
        errorMessage.matchAll(
          /column (?:[a-zA-Z_]+\\.)?([a-zA-Z0-9_]+) does not exist/g
        )
      );
      const missingColumns = new Set(missingMatches.map(([, column]) => column));
      const fallbackFields = contactFieldList.filter(
        (field) => !missingColumns.has(field)
      );
      const fallbackSelect =
        fallbackFields.length > 0 ? fallbackFields.join(", ") : contactFieldsFallback;
      const fallbackContacts = await supabaseClient
        .from("contacts")
        .select(fallbackSelect)
        .in("id", contactIds);
      if (!fallbackContacts.error && fallbackContacts.data) {
        contacts = (fallbackContacts.data ?? []) as unknown as ContactResumo[];
      } else {
        console.error("Inbox contacts error:", contactResponse.error.message);
      }
    }

    const leadMap = new Map(
      (leads ?? []).map((lead) => [lead.id, lead])
    );
    const contactMap = new Map(
      (contacts ?? []).map((contact) => [contact.id, contact])
    );
    const accountMap = new Map(
      (accounts ?? []).map((account) => [account.id, account])
    );

    const conversaIds = (data ?? []).map((item) => item.id);
    const autoresUltimaMensagem = new Map<
      string,
      { autor?: string | null; avatar?: string | null }
    >();

    if (conversaIds.length > 0 && statusAtual === "aberta") {
      await Promise.all(
        conversaIds.map(async (conversationId) => {
          const { data: ultimaMensagem } = await supabaseClient
            .from("messages")
            .select("autor, sender_avatar_url, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (ultimaMensagem) {
            autoresUltimaMensagem.set(conversationId, {
              autor: ultimaMensagem.autor ?? null,
              avatar: ultimaMensagem.sender_avatar_url ?? null,
            });
          }
        })
      );
    }

    const [leadTagsResponse, contactTagsResponse] = (await Promise.all([
      leadIds.length
        ? supabaseClient
          .from("lead_tags")
          .select("lead_id, tags (nome)")
          .eq("workspace_id", workspaceId)
          .in("lead_id", leadIds)
        : Promise.resolve(vazio),
      contactIds.length
        ? supabaseClient
          .from("contact_tags")
          .select("contact_id, tags (nome)")
          .eq("workspace_id", workspaceId)
          .in("contact_id", contactIds)
        : Promise.resolve(vazio),
    ])) as [
        QueryListResponse<LeadTagRegistro>,
        QueryListResponse<ContactTagRegistro>,
      ];

    if (leadTagsResponse.error) {
      console.error("Inbox lead tags error:", leadTagsResponse.error.message);
    }
    if (contactTagsResponse.error) {
      console.error(
        "Inbox contact tags error:",
        contactTagsResponse.error.message
      );
    }

    const tagsPorLead = new Map<string, string[]>();
    (leadTagsResponse.data ?? []).forEach((registro) => {
      if (!registro.lead_id) return;
      const tagItem = Array.isArray(registro.tags)
        ? registro.tags[0]
        : registro.tags;
      const nome = tagItem?.nome;
      if (!nome) return;
      const atual = tagsPorLead.get(registro.lead_id) ?? [];
      atual.push(nome);
      tagsPorLead.set(registro.lead_id, atual);
    });

    const tagsPorContato = new Map<string, string[]>();
    (contactTagsResponse.data ?? []).forEach((registro) => {
      if (!registro.contact_id) return;
      const tagItem = Array.isArray(registro.tags)
        ? registro.tags[0]
        : registro.tags;
      const nome = tagItem?.nome;
      if (!nome) return;
      const atual = tagsPorContato.get(registro.contact_id) ?? [];
      atual.push(nome);
      tagsPorContato.set(registro.contact_id, atual);
    });

    const mapeadas = (data ?? [])
      .map((item) => {
        const lead = item.leads ?? leadMap.get(item.lead_id ?? "") ?? null;
        const contact =
          item.contacts ?? contactMap.get(item.contact_id ?? "") ?? null;
        if (!lead && !contact) return null;
        const integrationAccount =
          item.integration_accounts ??
          accountMap.get(item.integration_account_id ?? "") ??
          null;
        const numeroCanal =
          integrationAccount?.numero ??
          integrationAccount?.identificador ??
          integrationAccount?.phone_number_id ??
          null;
        const ultimaMensagemInfo = autoresUltimaMensagem.get(item.id);
        const autorUltimaMensagem = ultimaMensagemInfo?.autor ?? null;
        const ultimaMensagemAutor = autorUltimaMensagem
          ? normalizarAutor(autorUltimaMensagem)
          : undefined;
        const avatarUltimaMensagem = ultimaMensagemInfo?.avatar ?? null;
        const ultima = item.ultima_mensagem ?? "";
        const ultimaData = item.ultima_mensagem_em ?? null;

        const leadIsGrupo =
          isNumeroGrupo(lead?.whatsapp_wa_id) || isNumeroGrupo(lead?.telefone);
        const contactIsGrupo = isNumeroGrupo(contact?.telefone);
        const isGrupo = leadIsGrupo || contactIsGrupo;
        const contatoBase = isGrupo ? (lead ?? contact) : (contact ?? lead);
        const nomeFallback =
          contatoBase === contact ? lead?.nome : contact?.nome;
        const nomeContato =
          contatoBase?.nome ||
          nomeFallback ||
          contatoBase?.telefone ||
          lead?.telefone ||
          contact?.telefone ||
          (isGrupo ? "Grupo" : "Contato sem nome");
        const avatarContato =
          contatoBase?.avatar_url ||
          contact?.avatar_url ||
          lead?.avatar_url ||
          avatarUltimaMensagem ||
          "/avatars/contato-placeholder.svg";
        const tagsContato = item.contact_id
          ? tagsPorContato.get(item.contact_id) ?? []
          : [];
        const tagsLead = item.lead_id ? tagsPorLead.get(item.lead_id) ?? [] : [];
        const tagsConversa = Array.from(new Set([...tagsContato, ...tagsLead]));

        const mensagensMapeadas: MensagemInbox[] = [];

        return {
          id: item.id,
          leadId: item.lead_id ?? undefined,
          contactId: item.contact_id ?? undefined,
          integrationAccountId: item.integration_account_id ?? undefined,
          numeroCanal: numeroCanal ?? undefined,
          nomeCanal: integrationAccount?.nome ?? undefined,
          providerCanal: integrationAccount?.provider ?? undefined,
          avatarCanal: integrationAccount?.avatar_url ?? undefined,
          contato: {
            id: lead?.id ?? item.lead_id ?? item.id,
            nome: nomeContato,
            telefone: contatoBase?.telefone ?? "",
            email: contatoBase?.email ?? "",
            avatarUrl: avatarContato,
            isGrupo,
            empresa: contact?.empresa ?? undefined,
            site: contact?.site ?? undefined,
            documento: contact?.documento ?? undefined,
            dataNascimento: contact?.data_nascimento ?? undefined,
            tags: tagsConversa,
            status: "Ativo",
            owner: item.owner_id ?? "Equipe",
          },
          canal: item.canal,
          status: item.status,
          ultimaMensagem: ultima,
          ultimaMensagemEm: ultimaData ?? undefined,
          horario: formatarHorario(ultimaData),
          ultimaMensagemAutor,
          naoLidas: 0,
          tags: tagsConversa,
          owner: item.owner_id ?? "Equipe",
          modoAtendimentoHumano: item.modo_atendimento_humano ?? false,
          mensagens: mensagensMapeadas,
          mensagensCursor: mensagensMapeadas[0]?.dataHora ?? null,
          mensagensHasMais: mensagensMapeadas.length >= LIMITE_MENSAGENS,
          mensagensCarregando: false,
        } satisfies ConversaInbox;
      })
      .filter(Boolean) as ConversaInbox[];

    const dedupeConversas = (lista: ConversaInbox[]) => {
      const vistos = new Set<string>();
      return lista.filter((conversa) => {
        if (conversa.canal !== "whatsapp") return true;
        const chave = conversa.leadId ?? conversa.contato.id;
        if (!chave) return true;
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      });
    };

    const fetchedCount = data?.length ?? 0;
    const mapeadasUnicas = dedupeConversas(mapeadas);
    setConversasHasMais(fetchedCount === LIMITE_CONVERSAS);

    setConversas((atuais) => {
      const anterioresMap = new Map(
        atuais.map((conversa) => [conversa.id, conversa])
      );
      // Apenas substituir completamente se explicitamente solicitado E não for refresh silencioso
      const deveSubstituir = options?.substituir && !options?.silencioso;
      const base = deveSubstituir ? [] : atuais;
      // Mesclar novas conversas com as existentes
      const novasIds = new Set(mapeadasUnicas.map((c) => c.id));
      const existentesSemDuplicatas = base.filter((c) => !novasIds.has(c.id));
      const combinadas = [...mapeadasUnicas, ...existentesSemDuplicatas];
      // Ordenar por ultima_mensagem_em decrescente
      combinadas.sort((a, b) => {
        const dataA = a.ultimaMensagemEm ? new Date(a.ultimaMensagemEm).getTime() : 0;
        const dataB = b.ultimaMensagemEm ? new Date(b.ultimaMensagemEm).getTime() : 0;
        return dataB - dataA;
      });
      const deduped = dedupeConversas(combinadas);
      return deduped.map((conversa) => {
        const anterior = anterioresMap.get(conversa.id);
        if (!anterior) return conversa;
        const mensagens =
          anterior.mensagens.length > 0 ? anterior.mensagens : conversa.mensagens;
        return {
          ...conversa,
          mensagens,
          mensagensCursor: anterior.mensagensCursor ?? conversa.mensagensCursor,
          mensagensHasMais:
            anterior.mensagensHasMais ?? conversa.mensagensHasMais,
          mensagensCarregando: anterior.mensagensCarregando ?? false,
        };
      });
    });

    if (!options?.silencioso && paginaAtual === 0) {
      setCarregando(false);
    }
  }, [
    workspaceId,
    filtroBasico,
    filtroCanal,
    filtroNumero,
    filtroOwner,
    statusAtual,
  ]);

  const carregarMensagens = React.useCallback(
    async (
      conversationId: string,
      options?: { before?: string }
    ) => {
      setConversas((atual) =>
        atual.map((conversa) =>
          conversa.id === conversationId
            ? { ...conversa, mensagensCarregando: true }
            : conversa
        )
      );

      let query = supabaseClient
        .from("messages")
        .select(
          "id, autor, tipo, conteudo, interno, created_at, sender_id, sender_nome, sender_avatar_url, quoted_message_id, quoted_conteudo, quoted_tipo, quoted_autor, quoted_sender_id, quoted_sender_nome, attachments (id, storage_path, tipo, tamanho_bytes)"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(LIMITE_MENSAGENS);

      if (options?.before) {
        query = query.lt("created_at", options.before);
      }

      const response = await query;

      if (response.error) {
        console.error("Inbox messages error:", response.error.message);
        setConversas((atual) =>
          atual.map((conversa) =>
            conversa.id === conversationId
              ? { ...conversa, mensagensCarregando: false }
              : conversa
          )
        );
        return;
      }

      const registros = response.data ?? [];
      const mensagensOrdenadas = registros
        .map((mensagem) => ({
          id: mensagem.id,
          autor: normalizarAutor(mensagem.autor),
          conteudo: mensagem.conteudo ?? "",
          tipo: mensagem.tipo as MensagemInbox["tipo"],
          horario: formatarHorario(mensagem.created_at),
          dataHora: mensagem.created_at ?? undefined,
          interno: mensagem.interno ?? false,
          senderId: mensagem.sender_id ?? undefined,
          senderNome: mensagem.sender_nome ?? undefined,
          senderAvatarUrl: mensagem.sender_avatar_url ?? undefined,
          resposta:
            mensagem.quoted_message_id ||
              mensagem.quoted_conteudo ||
              mensagem.quoted_sender_nome
              ? {
                messageId: mensagem.quoted_message_id ?? undefined,
                autor: mensagem.quoted_autor
                  ? normalizarAutor(mensagem.quoted_autor)
                  : undefined,
                senderId: mensagem.quoted_sender_id ?? undefined,
                senderNome: mensagem.quoted_sender_nome ?? undefined,
                tipo: mensagem.quoted_tipo ?? undefined,
                conteudo: mensagem.quoted_conteudo ?? undefined,
              }
              : undefined,
          anexos: (mensagem.attachments ?? []).map((anexo) => ({
            id: anexo.id,
            storagePath: anexo.storage_path,
            tipo: anexo.tipo,
            tamanhoBytes: anexo.tamanho_bytes ?? undefined,
          })),
        }))
        .reverse();

      setConversas((atual) =>
        atual.map((conversa) => {
          if (conversa.id !== conversationId) return conversa;
          const mensagensAtualizadas = options?.before
            ? [...mensagensOrdenadas, ...conversa.mensagens]
            : mensagensOrdenadas;
          const cursor = mensagensAtualizadas[0]?.dataHora ?? conversa.mensagensCursor;
          const carregouLimite = registros.length === LIMITE_MENSAGENS;
          const hasMais = options?.before
            ? carregouLimite
              ? conversa.mensagensHasMais ?? true
              : false
            : carregouLimite;

          const base = {
            ...conversa,
            mensagens: mensagensAtualizadas,
            mensagensCursor: cursor ?? null,
            mensagensHasMais: hasMais,
            mensagensCarregando: false,
          };

          if (conversa.contato.isGrupo) {
            return base;
          }
          if (isNomeGenerico(conversa.contato.nome)) {
            const candidato = mensagensAtualizadas.find(
              (mensagem) => mensagem.senderNome || mensagem.senderAvatarUrl
            );
            if (candidato) {
              return {
                ...base,
                contato: {
                  ...base.contato,
                  nome: candidato.senderNome ?? base.contato.nome,
                  avatarUrl:
                    candidato.senderAvatarUrl ?? base.contato.avatarUrl,
                },
              };
            }
          }
          return base;
        })
      );
    },
    []
  );

  const agendarRefresh = React.useCallback(() => {
    if (refreshTimerRef.current !== null) return;
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      // Não usar substituir: true para evitar reset da lista durante sincronização
      carregarConversas({ silencioso: true, pagina: 0 });
    }, 0);
  }, [carregarConversas]);

  React.useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  const atualizarConversa = React.useCallback(
    (
      conversationId: string,
      atualizar: (conversa: ConversaInbox) => ConversaInbox,
      moverParaTopo: boolean
    ) => {
      setConversas((atual) => {
        const index = atual.findIndex((conversa) => conversa.id === conversationId);
        if (index === -1) {
          agendarRefresh();
          return atual;
        }

        const conversa = atual[index];
        const conversaAtualizada = atualizar(conversa);
        if (!moverParaTopo) {
          const lista = atual.slice();
          lista[index] = conversaAtualizada;
          return lista;
        }

        const resto = [...atual.slice(0, index), ...atual.slice(index + 1)];
        return [conversaAtualizada, ...resto];
      });
    },
    [agendarRefresh]
  );

  const handleMessageCreated = React.useCallback(
    (payload: PusherMessagePayload) => {
      if (!payload?.conversation_id || !payload.message?.id) return;
      if (!shouldProcessEvent(payload.event_id)) return;
      logRealtimeLatency(payload.event_id, payload.emitted_at);

      atualizarConversa(
        payload.conversation_id,
        (conversa) => {
          if (conversa.mensagens.some((mensagem) => mensagem.id === payload.message.id)) {
            return conversa;
          }

          const createdAt = payload.message.created_at;
          const mensagemNova = {
            id: payload.message.id,
            autor: normalizarAutor(payload.message.autor),
            tipo: payload.message.tipo,
            conteudo: payload.message.conteudo ?? "",
            horario: formatarHorario(createdAt),
            dataHora: createdAt ?? undefined,
            interno: payload.message.interno ?? false,
            clientMessageId: payload.message.client_message_id ?? undefined,
            envioStatus: "sent",
            anexos: [] as MensagemInbox["anexos"],
            senderId: payload.message.sender_id ?? undefined,
            senderNome: payload.message.sender_nome ?? undefined,
            senderAvatarUrl: payload.message.sender_avatar_url ?? undefined,
            resposta:
              payload.message.quoted_message_id ||
                payload.message.quoted_conteudo ||
                payload.message.quoted_sender_nome
                ? {
                  messageId: payload.message.quoted_message_id ?? undefined,
                  autor: payload.message.quoted_autor
                    ? normalizarAutor(payload.message.quoted_autor)
                    : undefined,
                  senderId: payload.message.quoted_sender_id ?? undefined,
                  senderNome: payload.message.quoted_sender_nome ?? undefined,
                  tipo: payload.message.quoted_tipo ?? undefined,
                  conteudo: payload.message.quoted_conteudo ?? undefined,
                }
                : undefined,
          };
          const mensagensAtualizadas = [...conversa.mensagens, mensagemNova];
          const isGrupo = Boolean(conversa.contato.isGrupo);
          const deveAtualizarContato =
            !isGrupo &&
            isNomeGenerico(conversa.contato.nome) &&
            (mensagemNova.senderNome || mensagemNova.senderAvatarUrl);

          return {
            ...conversa,
            mensagens: mensagensAtualizadas,
            mensagensCursor: conversa.mensagensCursor ?? mensagemNova.dataHora ?? null,
            mensagensHasMais: conversa.mensagensHasMais ?? true,
            ultimaMensagem: mensagemNova.conteudo,
            ultimaMensagemEm: createdAt ?? conversa.ultimaMensagemEm,
            ultimaMensagemAutor: mensagemNova.autor,
            horario: mensagemNova.horario,
            contato: deveAtualizarContato
              ? {
                ...conversa.contato,
                nome: mensagemNova.senderNome ?? conversa.contato.nome,
                avatarUrl: mensagemNova.senderAvatarUrl ?? conversa.contato.avatarUrl,
              }
              : conversa.contato,
          };
        },
        true
      );
    },
    [atualizarConversa, logRealtimeLatency, shouldProcessEvent]
  );

  const handleAttachmentCreated = React.useCallback(
    (payload: PusherAttachmentPayload) => {
      if (!payload?.conversation_id || !payload.message_id || !payload.attachment?.id) {
        return;
      }
      if (!shouldProcessEvent(payload.event_id)) return;
      logRealtimeLatency(payload.event_id, payload.emitted_at);

      setConversas((atual) => {
        const index = atual.findIndex((conversa) => conversa.id === payload.conversation_id);
        if (index === -1) {
          agendarRefresh();
          return atual;
        }

        const conversa = atual[index];
        const mensagemIndex = conversa.mensagens.findIndex(
          (mensagem) => mensagem.id === payload.message_id
        );
        if (mensagemIndex === -1) {
          agendarRefresh();
          return atual;
        }

        const alvo = conversa.mensagens[mensagemIndex];
        const anexos = Array.isArray(alvo.anexos)
          ? alvo.anexos
          : ([] as NonNullable<MensagemInbox["anexos"]>);
        if (anexos.some((item) => item.id === payload.attachment.id)) return atual;

        const atualizado = {
          ...alvo,
          anexos: [
            ...anexos,
            {
              id: payload.attachment.id,
              storagePath: payload.attachment.storage_path,
              tipo: payload.attachment.tipo,
              tamanhoBytes: payload.attachment.tamanho_bytes ?? undefined,
            },
          ],
        };
        const mensagensAtualizadas = conversa.mensagens.slice();
        mensagensAtualizadas[mensagemIndex] = atualizado;
        const lista = atual.slice();
        lista[index] = { ...conversa, mensagens: mensagensAtualizadas };
        return lista;
      });
    },
    [agendarRefresh, logRealtimeLatency, shouldProcessEvent]
  );

  const handleConversationUpdated = React.useCallback(
    (payload: PusherConversationUpdatedPayload) => {
      if (!payload?.conversation_id) return;
      if (!shouldProcessEvent(payload.event_id)) return;
      logRealtimeLatency(payload.event_id, payload.emitted_at);
      const moverParaTopo = Boolean(payload.ultima_mensagem_em);

      atualizarConversa(
        payload.conversation_id,
        (conversa) => {
          const tagsAtualizadas = payload.tags ?? conversa.tags;
          const ultimaMensagemEm = payload.ultima_mensagem_em ?? conversa.ultimaMensagemEm;
          const horario = payload.ultima_mensagem_em
            ? formatarHorario(payload.ultima_mensagem_em)
            : conversa.horario;
          const ownerAtualizado = Object.prototype.hasOwnProperty.call(
            payload,
            "owner_id"
          )
            ? payload.owner_id || "Equipe"
            : conversa.owner;

          return {
            ...conversa,
            status: payload.status ?? conversa.status,
            owner: ownerAtualizado,
            ultimaMensagem: payload.ultima_mensagem ?? conversa.ultimaMensagem,
            ultimaMensagemEm,
            horario,
            tags: tagsAtualizadas,
            contato: { ...conversa.contato, tags: tagsAtualizadas },
          };
        },
        moverParaTopo
      );
    },
    [atualizarConversa, logRealtimeLatency, shouldProcessEvent]
  );

  const handleTagsUpdated = React.useCallback(
    (payload: PusherTagsUpdatedPayload) => {
      if (!payload?.conversation_id) return;
      if (!shouldProcessEvent(payload.event_id)) return;
      logRealtimeLatency(payload.event_id, payload.emitted_at);
      atualizarConversa(
        payload.conversation_id,
        (conversa) => ({
          ...conversa,
          tags: payload.tags,
          contato: { ...conversa.contato, tags: payload.tags },
        }),
        false
      );
    },
    [atualizarConversa, logRealtimeLatency, shouldProcessEvent]
  );

  const handleAtualizarTagsLocal = React.useCallback(
    (conversationId: string, tags: string[]) => {
      handleTagsUpdated({
        conversation_id: conversationId,
        tags,
        event_id: "local",
        workspace_id: workspaceId ?? "",
      });
    },
    [handleTagsUpdated, workspaceId]
  );

  React.useEffect(() => {
    if (!workspaceId) return;
    setPaginaConversas(0);
    setConversasHasMais(true);
    carregarConversas({ pagina: 0, substituir: true });
  }, [carregarConversas, workspaceId]);

  React.useEffect(() => {
    if (!workspaceId || !session?.access_token) return;
    const pusher = pusherRef.current ?? createPusherClient(session.access_token);
    pusherRef.current = pusher;

    const channelName = workspaceChannel(workspaceId);
    const channel = pusher.subscribe(channelName);

    channel.bind("conversation:updated", handleConversationUpdated);
    channel.bind("tags:updated", handleTagsUpdated);

    return () => {
      channel.unbind("conversation:updated", handleConversationUpdated);
      channel.unbind("tags:updated", handleTagsUpdated);
      pusher.unsubscribe(channelName);
      if (pusherRef.current === pusher) {
        pusher.disconnect();
        pusherRef.current = null;
      }
    };
  }, [
    handleConversationUpdated,
    handleTagsUpdated,
    session?.access_token,
    workspaceId,
  ]);

  const conversasFiltradas = React.useMemo(() => {
    const filtradas = conversas.filter((conversa) => {
      const ownerAtual = conversa.owner?.trim();
      const isNaoAtribuido =
        !ownerAtual || ownerAtual === "Equipe" || ownerAtual === "nao atribuido";
      if (["nao-iniciados", "pendente"].includes(filtroBasico)) {
        if (conversa.status !== "pendente") return false;
      } else if (filtroBasico === "em-aberto") {
        if (conversa.status !== "aberta") return false;
      } else if (filtroBasico === "finalizadas") {
        if (conversa.status !== "resolvida") return false;
      } else if (filtroBasico === "spam") {
        if (conversa.status !== "spam") return false;
      } else if (conversa.status !== statusAtual) {
        return false;
      }
      if (
        filtroBasico === "tudo" &&
        statusAtual === "aberta" &&
        conversa.ultimaMensagemAutor === "contato"
      ) {
        return false;
      }
      if (filtroCanal !== "todos" && conversa.canal !== filtroCanal) {
        return false;
      }
      if (
        filtroNumero !== "todos" &&
        conversa.integrationAccountId !== filtroNumero
      ) {
        return false;
      }
      if (filtroAtribuicao === "nao-atribuido" && !isNaoAtribuido) {
        return false;
      }
      if (filtroAtribuicao === "atribuido") {
        if (isNaoAtribuido) {
          return false;
        }
        if (filtroOwner !== "todos" && conversa.owner !== filtroOwner) {
          return false;
        }
      }
      if (somenteNaoLidas && conversa.naoLidas === 0) {
        return false;
      }
      if (filtroSemTags && conversa.tags.length > 0) {
        return false;
      }
      if (filtroTag && !conversa.tags.includes(filtroTag)) {
        return false;
      }
      if (filtroBasico === "nunca-respondidos") {
        if (conversa.status !== "aberta") {
          return false;
        }
        if (conversa.ultimaMensagemAutor !== "contato") {
          return false;
        }
      }
      if (filtroBasico === "meus" && session?.user?.id) {
        if (conversa.owner !== session.user.id) {
          return false;
        }
      }
      if (ocultarGrupos) {
        const telefoneContato = conversa.contato.telefone ?? "";
        const isGrupo =
          conversa.contato.isGrupo || telefoneContato.includes("@g.us");
        if (isGrupo) {
          return false;
        }
      }
      if (!busca) {
        return true;
      }

      const termo = busca.toLowerCase();
      return (
        conversa.contato.nome.toLowerCase().includes(termo) ||
        conversa.ultimaMensagem.toLowerCase().includes(termo)
      );
    });
    const ordenarPorHorario = (conversa: ConversaInbox) =>
      new Date(conversa.ultimaMensagemEm ?? 0).getTime();
    return filtradas
      .slice()
      .sort((a, b) =>
        ordenacaoConversas === "antigas"
          ? ordenarPorHorario(a) - ordenarPorHorario(b)
          : ordenarPorHorario(b) - ordenarPorHorario(a)
      );
  }, [
    busca,
    conversas,
    filtroCanal,
    filtroBasico,
    filtroAtribuicao,
    filtroOwner,
    filtroNumero,
    filtroSemTags,
    filtroTag,
    ordenacaoConversas,
    ocultarGrupos,
    session,
    somenteNaoLidas,
    statusAtual,
  ]);

  const conversaSelecionada = React.useMemo(() => {
    return (
      conversasFiltradas.find((conversa) => conversa.id === selecionadaId) ??
      conversasFiltradas[0] ??
      null
    );
  }, [conversasFiltradas, selecionadaId]);

  React.useEffect(() => {
    if (!workspaceId || !session?.access_token || !conversaSelecionada?.id) {
      return;
    }

    const pusher = pusherRef.current ?? createPusherClient(session.access_token);
    pusherRef.current = pusher;

    const channelName = conversationChannel(conversaSelecionada.id);
    const channel = pusher.subscribe(channelName);

    channel.bind("message:created", handleMessageCreated);
    channel.bind("attachment:created", handleAttachmentCreated);

    return () => {
      channel.unbind("message:created", handleMessageCreated);
      channel.unbind("attachment:created", handleAttachmentCreated);
      pusher.unsubscribe(channelName);
    };
  }, [
    conversaSelecionada?.id,
    handleAttachmentCreated,
    handleMessageCreated,
    session?.access_token,
    workspaceId,
  ]);

  const handleAtualizarConversasSilencioso = React.useCallback(() => {
    if (conversaSelecionada?.id) {
      carregarMensagens(conversaSelecionada.id);
      carregarConversas({ silencioso: true, pagina: 0, substituir: true });
      return;
    }
    carregarConversas({ silencioso: true, pagina: 0, substituir: true });
  }, [
    carregarConversas,
    carregarMensagens,
    conversaSelecionada,
  ]);

  const handleCarregarMaisMensagens = React.useCallback(() => {
    if (!conversaSelecionada?.id) return;
    if (conversaSelecionada.mensagensCarregando) return;
    if (conversaSelecionada.mensagensHasMais === false) return;
    const cursor = conversaSelecionada.mensagensCursor;
    if (!cursor) return;
    carregarMensagens(conversaSelecionada.id, { before: cursor });
  }, [
    carregarMensagens,
    conversaSelecionada,
  ]);

  const conversasVisiveis = conversasFiltradas;

  React.useEffect(() => {
    if (!selecionadaId) {
      setSelecionadaId(conversasFiltradas[0]?.id ?? null);
      return;
    }

    const existe = conversasFiltradas.some(
      (conversa) => conversa.id === selecionadaId
    );
    if (!existe) {
      setSelecionadaId(conversasFiltradas[0]?.id ?? null);
    }
  }, [conversasFiltradas, selecionadaId]);

  React.useEffect(() => {
    if (!conversaSelecionada?.id) return;
    if (conversaSelecionada.mensagens.length > 0) return;
    carregarMensagens(conversaSelecionada.id);
  }, [
    carregarMensagens,
    conversaSelecionada?.id,
    conversaSelecionada?.mensagens.length,
  ]);

  const owners = React.useMemo(() => {
    if (membrosEquipe.length) {
      return membrosEquipe;
    }
    const todos = new Map<string, { id: string; userId: string; nome: string }>();
    conversas.forEach((conversa) => {
      if (!conversa.owner) return;
      todos.set(conversa.owner, {
        id: conversa.owner,
        userId: conversa.owner,
        nome: conversa.owner,
      });
    });
    return Array.from(todos.values());
  }, [conversas, membrosEquipe]);

  const tagsDisponiveis = React.useMemo(() => {
    const tags = new Set<string>();
    conversas.forEach((conversa) => {
      conversa.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [conversas]);

  const handleCarregarMais = React.useCallback(() => {
    if (!conversasHasMais) return;
    const proxima = paginaConversas + 1;
    setPaginaConversas(proxima);
    carregarConversas({ pagina: proxima });
  }, [carregarConversas, conversasHasMais, paginaConversas]);

  const handleMarcarNaoLido = React.useCallback((id: string) => {
    setConversas((atual) =>
      atual.map((conversa) =>
        conversa.id === id
          ? { ...conversa, naoLidas: Math.max(conversa.naoLidas, 1) }
          : conversa
      )
    );
  }, []);

  const handleAlterarStatus = React.useCallback(
    async (id: string, status: StatusConversa) => {
      setConversas((atual) =>
        atual.map((conversa) =>
          conversa.id === id
            ? {
              ...conversa,
              status,
              contato:
                status === "resolvida"
                  ? { ...conversa.contato, status: "Ganho" }
                  : conversa.contato,
            }
            : conversa
        )
      );
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/inbox/conversations/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        agendarRefresh();
      }

      void carregarContagem();
    },
    [agendarRefresh, carregarContagem, session?.access_token]
  );

  const handleAtualizarContato = React.useCallback(
    async (contatoId: string, atualizacao: Partial<ContatoInbox>) => {
      setConversas((atual) =>
        atual.map((conversa) =>
          conversa.contato.id === contatoId
            ? {
              ...conversa,
              contato: { ...conversa.contato, ...atualizacao },
            }
            : conversa
        )
      );

      if (!workspaceId) return;
      await supabaseClient
        .from("leads")
        .update({
          nome: atualizacao.nome,
          email: atualizacao.email,
          telefone: atualizacao.telefone,
        })
        .eq("id", contatoId)
        .eq("workspace_id", workspaceId);
    },
    [workspaceId]
  );

  const estiloColunas = React.useMemo(
    () =>
      ({
        "--col-esq": "340px",
        "--col-dir": colapsadaContato ? "0px" : "320px",
      }) as React.CSSProperties,
    [colapsadaContato]
  );

  if (!session) {
    return null;
  }

  if (carregando) {
    return (
      <div
        className="grid gap-5 lg:grid-cols-[var(--col-esq)_minmax(0,1fr)_var(--col-dir)]"
        style={estiloColunas}
      >
        <div className="rounded-[6px] border border-border/50 bg-card/60 p-5 shadow-none">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[6px] border border-border/50 bg-card/60 p-5 shadow-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        {!colapsadaContato && (
          <div className="rounded-[6px] border border-border/50 bg-card/60 p-5 shadow-none">
            <div className="space-y-4">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="grid h-[calc(100vh-56px)] min-h-0 gap-5 lg:grid-cols-[var(--col-esq)_minmax(0,1fr)_var(--col-dir)] transition-[grid-template-columns] duration-300 ease-out"
      style={estiloColunas}
    >
      <ListaConversas
        contagens={contagens}
        conversas={conversasVisiveis}
        selecionadaId={conversaSelecionada?.id ?? null}
        aoSelecionar={setSelecionadaId}
        aoMarcarNaoLido={handleMarcarNaoLido}
        statusAtual={statusAtual}
        aoAlterarStatus={setStatusAtual}
        ordenacao={ordenacaoConversas}
        aoAlterarOrdenacao={setOrdenacaoConversas}
        filtroBasico={filtroBasico}
        aoAlterarFiltroBasico={setFiltroBasico}
        filtroAtribuicao={filtroAtribuicao}
        aoAlterarFiltroAtribuicao={setFiltroAtribuicao}
        filtroTag={filtroTag}
        aoAlterarFiltroTag={setFiltroTag}
        filtroSemTags={filtroSemTags}
        aoAlterarFiltroSemTags={setFiltroSemTags}
        busca={busca}
        aoAlterarBusca={setBusca}
        filtroCanal={filtroCanal}
        aoAlterarFiltroCanal={setFiltroCanal}
        filtroOwner={filtroOwner}
        aoAlterarFiltroOwner={setFiltroOwner}
        aoAlterarFiltroNumero={setFiltroNumero}
        owners={owners}
        usuarioAtualId={session?.user?.id ?? null}
        tagsDisponiveis={tagsDisponiveis}
        somenteNaoLidas={somenteNaoLidas}
        aoAlterarSomenteNaoLidas={setSomenteNaoLidas}
        ocultarGrupos={ocultarGrupos}
        aoAlterarOcultarGrupos={setOcultarGrupos}
        aoCarregarMais={handleCarregarMais}
        temMais={conversasHasMais}
      />

      <ChatConversa
        conversa={conversaSelecionada}
        contatoAberto={!colapsadaContato}
        aoAlternarContato={() => setColapsadaContato((valor) => !valor)}
        aoAlterarStatus={handleAlterarStatus}
        aoAtualizarConversa={handleAtualizarConversasSilencioso}
        aoAtualizarTags={handleAtualizarTagsLocal}
        aoCarregarMaisMensagens={handleCarregarMaisMensagens}
      />

      <PainelContato
        conversa={conversaSelecionada}
        colapsada={colapsadaContato}
        aoAlternarColapso={() => setColapsadaContato((valor) => !valor)}
        aoAtualizarContato={handleAtualizarContato}
      />
    </div>
  );
}
