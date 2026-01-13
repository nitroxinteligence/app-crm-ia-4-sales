"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import type { CanalId, ContatoInbox, ConversaInbox, StatusConversa } from "@/lib/types";
import { supabaseClient } from "@/lib/supabase/client";
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

const normalizarAutor = (autor?: string | null) => {
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
  const [session, setSession] = React.useState<Session | null>(null);
  const [carregandoSessao, setCarregandoSessao] = React.useState(true);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [conversas, setConversas] = React.useState<ConversaInbox[]>([]);
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
  const ultimoEventoRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    let ativo = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSession(data.session ?? null);
      setCarregandoSessao(false);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setCarregandoSessao(false);
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

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

    carregar().catch(() => undefined);
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
    const contactFields = contactFieldList.join(", ");
    const contactFieldsFallback = ["id", "nome", "telefone", "email", "empresa"].join(", ");
    let data = null as Array<any> | null;
    const full = await supabaseClient
      .from("conversations")
      .select(baseSelect)
      .eq("workspace_id", workspaceId)
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
        : Promise.resolve({ data: [] }),
      accountIds.length
        ? supabaseClient
            .from("integration_accounts")
            .select(
              "id, numero, nome, provider, identificador, phone_number_id, avatar_url"
            )
            .in("id", accountIds)
        : Promise.resolve({ data: [] }),
      contactIds.length
        ? supabaseClient
            .from("contacts")
            .select(
              "id, nome, telefone, email, avatar_url, empresa, site, documento, data_nascimento"
            )
            .in("id", contactIds)
        : Promise.resolve({ data: [] }),
    ]);

    let leads = leadResponse.data ?? [];
    if (leadResponse.error?.message?.includes("avatar_url") && leadIds.length) {
      const fallbackLeads = await supabaseClient
        .from("leads")
        .select("id, nome, telefone, email")
        .in("id", leadIds);
      if (!fallbackLeads.error && fallbackLeads.data) {
        leads = fallbackLeads.data;
      }
    } else if (leadResponse.error) {
      console.error("Inbox leads error:", leadResponse.error.message);
    }
    let accounts = accountResponse.data ?? [];
    if (accountResponse.error?.message?.includes("avatar_url") && accountIds.length) {
      const fallbackAccounts = await supabaseClient
        .from("integration_accounts")
        .select("id, numero, nome, provider, identificador, phone_number_id")
        .in("id", accountIds);
      if (!fallbackAccounts.error && fallbackAccounts.data) {
        accounts = fallbackAccounts.data;
      }
    } else if (accountResponse.error) {
      console.error("Inbox accounts error:", accountResponse.error.message);
    }
    let contacts = contactResponse.data ?? [];
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
        contacts = fallbackContacts.data;
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
      const mensagensOrdenadas = (item.messages ?? [])
        .slice()
        .sort(
          (a, b) =>
            new Date(a.created_at ?? 0).getTime() -
            new Date(b.created_at ?? 0).getTime()
        );
      const avatarUltimaMensagem = (() => {
        for (let i = mensagensOrdenadas.length - 1; i >= 0; i -= 1) {
          const avatar = mensagensOrdenadas[i]?.sender_avatar_url;
          if (avatar) return avatar;
        }
        return null;
      })();
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

      const mensagensMapeadas = mensagensOrdenadas.map((mensagem) => ({
        id: mensagem.id,
        autor: normalizarAutor(mensagem.autor),
        conteudo: mensagem.conteudo ?? "",
        tipo: mensagem.tipo,
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
      }));

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
          empresa: contatoBase?.empresa ?? undefined,
          site: contatoBase?.site ?? undefined,
          documento: contatoBase?.documento ?? undefined,
          dataNascimento: contatoBase?.data_nascimento ?? undefined,
          tags: [],
          status: "Ativo",
          owner: item.owner_id ?? "Equipe",
        },
        canal: item.canal,
        status: item.status,
        ultimaMensagem: ultima,
        ultimaMensagemEm: ultimaData ?? undefined,
        horario: formatarHorario(ultimaData),
        naoLidas: 0,
        tags: [],
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
      const base = options?.substituir || paginaAtual === 0 ? [] : atuais;
      const combinadas = [...base, ...mapeadasUnicas];
      const vistos = new Set<string>();
      const combinadasUnicas = combinadas.filter((conversa) => {
        if (vistos.has(conversa.id)) return false;
        vistos.add(conversa.id);
        return true;
      });
      const deduped = dedupeConversas(combinadasUnicas);
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
  }, [workspaceId]);

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
          tipo: mensagem.tipo,
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
      carregarConversas({ silencioso: true, pagina: 0, substituir: true });
    }, 1500);
  }, [carregarConversas]);

  React.useEffect(() => {
    if (!workspaceId) return;
    setPaginaConversas(0);
    setConversasHasMais(true);
    carregarConversas({ pagina: 0, substituir: true });

    const channel = supabaseClient
      .channel(`inbox-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const evento = payload.eventType;
          const novo = payload.new as
            | {
                id: string;
                conversation_id: string;
                autor: string;
                tipo: string;
                conteudo: string | null;
                created_at: string;
                sender_id?: string | null;
                sender_nome?: string | null;
                sender_avatar_url?: string | null;
                quoted_message_id?: string | null;
                quoted_conteudo?: string | null;
                quoted_tipo?: string | null;
                quoted_autor?: string | null;
                quoted_sender_id?: string | null;
                quoted_sender_nome?: string | null;
              }
            | null;

          if (evento === "INSERT" && novo?.conversation_id) {
            ultimoEventoRef.current = Date.now();
            let atualizado = false;
            setConversas((atual) => {
              const index = atual.findIndex(
                (conversa) => conversa.id === novo.conversation_id
              );
              if (index === -1) {
                agendarRefresh();
                return atual;
              }

              const conversa = atual[index];
              if (
                conversa.mensagens.some((mensagem) => mensagem.id === novo.id)
              ) {
                return atual;
              }

              atualizado = true;
              const mensagemNova = {
                id: novo.id,
                autor: normalizarAutor(novo.autor),
                tipo: novo.tipo,
                conteudo: novo.conteudo ?? "",
                horario: formatarHorario(novo.created_at),
                dataHora: novo.created_at ?? undefined,
                senderId: novo.sender_id ?? undefined,
                senderNome: novo.sender_nome ?? undefined,
                senderAvatarUrl: novo.sender_avatar_url ?? undefined,
                resposta:
                  novo.quoted_message_id ||
                  novo.quoted_conteudo ||
                  novo.quoted_sender_nome
                    ? {
                        messageId: novo.quoted_message_id ?? undefined,
                        autor: novo.quoted_autor
                          ? normalizarAutor(novo.quoted_autor)
                          : undefined,
                        senderId: novo.quoted_sender_id ?? undefined,
                        senderNome: novo.quoted_sender_nome ?? undefined,
                        tipo: novo.quoted_tipo ?? undefined,
                        conteudo: novo.quoted_conteudo ?? undefined,
                      }
                    : undefined,
              };
              const mensagensAtualizadas = [
                ...conversa.mensagens,
                mensagemNova,
              ];
              const isGrupo = Boolean(conversa.contato.isGrupo);
              const deveAtualizarContato =
                !isGrupo &&
                isNomeGenerico(conversa.contato.nome) &&
                (mensagemNova.senderNome || mensagemNova.senderAvatarUrl);
              const conversaAtualizada = {
                ...conversa,
                mensagens: mensagensAtualizadas,
                mensagensCursor:
                  conversa.mensagensCursor ?? mensagemNova.dataHora ?? null,
                mensagensHasMais: conversa.mensagensHasMais ?? true,
                ultimaMensagem: mensagemNova.conteudo,
                ultimaMensagemEm: novo.created_at ?? conversa.ultimaMensagemEm,
                horario: mensagemNova.horario,
                contato: deveAtualizarContato
                  ? {
                      ...conversa.contato,
                      nome: mensagemNova.senderNome ?? conversa.contato.nome,
                      avatarUrl:
                        mensagemNova.senderAvatarUrl ?? conversa.contato.avatarUrl,
                    }
                  : conversa.contato,
              };
              const resto = [
                ...atual.slice(0, index),
                ...atual.slice(index + 1),
              ];
              return [conversaAtualizada, ...resto];
            });

            if (!atualizado) {
              agendarRefresh();
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          ultimoEventoRef.current = Date.now();
          agendarRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "integration_accounts",
        },
        () => {
          ultimoEventoRef.current = Date.now();
          agendarRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => agendarRefresh()
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [agendarRefresh, carregarConversas, workspaceId]);

  React.useEffect(() => {
    const intervalo = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      agendarRefresh();
    }, 6000);
    return () => window.clearInterval(intervalo);
  }, [agendarRefresh]);

  const conversasFiltradas = React.useMemo(() => {
    const filtradas = conversas.filter((conversa) => {
      const ownerAtual = conversa.owner?.trim();
      const isNaoAtribuido =
        !ownerAtual || ownerAtual === "Equipe" || ownerAtual === "nao atribuido";
      if (filtroBasico === "pendente") {
        if (conversa.status !== "pendente") {
          return false;
        }
      } else if (conversa.status !== statusAtual) {
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
        if (conversa.mensagens.length > 0 || conversa.ultimaMensagem) {
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
    session?.user?.id,
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
    conversaSelecionada?.id,
    conversaSelecionada?.mensagens.length,
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
    conversaSelecionada?.id,
    conversaSelecionada?.mensagensCarregando,
    conversaSelecionada?.mensagensHasMais,
    conversaSelecionada?.mensagensCursor,
  ]);

  const conversasVisiveis = conversasFiltradas;

  React.useEffect(() => {
    setPaginaConversas(0);
    setConversasHasMais(true);
    carregarConversas({ pagina: 0, substituir: true });
  }, [
    busca,
    filtroAtribuicao,
    filtroBasico,
    filtroCanal,
    filtroOwner,
    filtroNumero,
    filtroSemTags,
    filtroTag,
    somenteNaoLidas,
    statusAtual,
    carregarConversas,
  ]);

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

  const handleResolverConversa = React.useCallback(
    async (id: string) => {
      setConversas((atual) =>
        atual.map((conversa) =>
          conversa.id === id
            ? {
                ...conversa,
                status: "resolvida",
                contato: { ...conversa.contato, status: "Ganho" },
              }
            : conversa
        )
      );

      if (!workspaceId) return;
      await supabaseClient
        .from("conversations")
        .update({ status: "resolvida" })
        .eq("id", id)
        .eq("workspace_id", workspaceId);
    },
    [workspaceId]
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

  if (!session && !carregandoSessao) {
    return null;
  }

  if (carregando || carregandoSessao) {
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
      className="grid gap-5 lg:grid-cols-[var(--col-esq)_minmax(0,1fr)_var(--col-dir)] transition-[grid-template-columns] duration-300 ease-out"
      style={estiloColunas}
    >
      <ListaConversas
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
        aoResolverConversa={handleResolverConversa}
        aoAtualizarConversa={handleAtualizarConversasSilencioso}
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
