"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  ArrowUp,
  FileAudio,
  ImageIcon,
  Maximize2,
  Brain,
  Mic,
  Paperclip,
  PauseCircle,
  Send,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type {
  AgenteIA,
  AgendaAgente,
  ArquivoConhecimento,
  CanalId,
  FollowupAgente,
  NumeroWhatsapp,
  TipoAgente,
  TemplateWhatsapp,
  TomAgente,
} from "@/lib/types";
import { nomeCanal } from "@/lib/canais";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { adicionarNotificacao } from "@/lib/notificacoes";
import { supabaseClient } from "@/lib/supabase/client";
import {
  horariosAgente,
  permissoesBase,
  statusBadge,
  templatesAgente,
  tiposAgente,
  tonsAgente,
} from "@/lib/config-agentes";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type EditorAgenteProps = {
  modo: "criar" | "editar";
  agenteId?: string;
  layout?: "wizard" | "tabs";
  provider?: string;
};

type ProviderAgente = "whatsapp_oficial" | "whatsapp_baileys";

type MensagemTeste = {
  id: string;
  autor: "usuario" | "agente";
  texto: string;
  anexos?: Array<{
    id: string;
    nome: string;
    tipo: "imagem" | "audio" | "arquivo";
    url?: string;
  }>;
};

const agenteVazio: AgenteIA = {
  id: "novo",
  nome: "",
  tipo: "sdr",
  status: "ativo",
  canais: ["whatsapp"],
  tom: "consultivo",
  horario: "comercial",
  uso: { utilizado: 0, limite: 600 },
};

const contarPalavras = (texto: string) =>
  texto
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const limitarPalavras = (texto: string, limite: number) => {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  if (palavras.length <= limite) return texto;
  return palavras.slice(0, limite).join(" ");
};

const limitarTexto = (
  texto: string,
  maxPalavras: number,
  maxCaracteres: number
) => {
  let limitado = texto;
  if (limitado.length > maxCaracteres) {
    limitado = limitado.slice(0, maxCaracteres);
  }
  return limitarPalavras(limitado, maxPalavras);
};

const estimarMinutosProcessamento = (bytes: number) => {
  const megabytes = bytes / (1024 * 1024);
  const estimativa = Math.ceil(megabytes * 1.5);
  return Math.max(2, Math.min(12, estimativa));
};

const normalizarNomeArquivo = (nomeOriginal: string) => {
  const partes = nomeOriginal.split(".");
  const extensao = partes.length > 1 ? `.${partes.pop()}` : "";
  const base = partes.join(".");
  const baseNormalizada = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const baseSegura = baseNormalizada
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  const extensaoSegura = extensao
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.]+/g, "")
    .toLowerCase();
  const nomeFinal = baseSegura || "arquivo";
  return `${nomeFinal}${extensaoSegura}`;
};

const limparNumeroWhatsApp = (valor?: string | null) => {
  if (!valor) return "";
  let texto = valor;
  if (texto.includes("@")) {
    texto = texto.split("@")[0] ?? texto;
  }
  if (texto.includes(":")) {
    texto = texto.split(":")[0] ?? texto;
  }
  return texto.trim();
};

export function EditorAgente({
  modo,
  agenteId,
  provider,
  layout = "tabs",
}: EditorAgenteProps) {
  const { usuario, workspace, plano } = useAutenticacao();
  const router = useRouter();
  const modoCriacao = modo === "criar";
  const usarWizard = modoCriacao || layout === "wizard";
  const providerInicial: ProviderAgente | null =
    provider === "whatsapp_baileys" || provider === "whatsapp_nao_oficial"
      ? "whatsapp_baileys"
      : provider === "whatsapp_oficial"
        ? "whatsapp_oficial"
        : null;
  const [providerSelecionado, setProviderSelecionado] =
    React.useState<ProviderAgente | null>(providerInicial);
  const [abaAtiva, setAbaAtiva] = React.useState("configuracao");
  const [formAgente, setFormAgente] = React.useState<AgenteIA>(agenteVazio);
  const [agenteIdAtual, setAgenteIdAtual] = React.useState<string | null>(
    agenteId ?? null
  );
  const agenteIdConsulta = modoCriacao ? agenteIdAtual : agenteId ?? agenteIdAtual;
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [permissoes, setPermissoes] = React.useState<Record<string, boolean>>(
    () =>
      permissoesBase.reduce(
        (acc, item) => ({ ...acc, [item.id]: item.habilitado }),
        {} as Record<string, boolean>
      )
  );
  type ArquivoConhecimentoUI = ArquivoConhecimento & { storagePath?: string };
  const [arquivosConhecimento, setArquivosConhecimento] =
    React.useState<ArquivoConhecimentoUI[]>([]);
  const [faq, setFaq] = React.useState("");
  const [promptAgente, setPromptAgente] = React.useState("");
  const [tomPersonalizado, setTomPersonalizado] = React.useState("");
  const [logsAuditoria, setLogsAuditoria] = React.useState<
    { id: string; data: string; resumo: string; createdAt: string }[]
  >([]);
  const [numerosWhatsapp, setNumerosWhatsapp] = React.useState<NumeroWhatsapp[]>(
    []
  );
  const [canalSelecionado, setCanalSelecionado] = React.useState<CanalId>("whatsapp");
  const [templatesWhatsapp, setTemplatesWhatsapp] = React.useState<
    TemplateWhatsapp[]
  >([]);
  const [sincronizandoTemplates, setSincronizandoTemplates] =
    React.useState(false);
  const [erroTemplates, setErroTemplates] = React.useState<string | null>(null);
  const [agendasDisponiveis, setAgendasDisponiveis] = React.useState<
    AgendaAgente[]
  >([]);
  const [agendasSelecionadas, setAgendasSelecionadas] = React.useState<string[]>(
    []
  );
  const [agendaEmSelecao, setAgendaEmSelecao] = React.useState("");
  const [followups, setFollowups] = React.useState<FollowupAgente[]>([]);
  const [tagsDisponiveis, setTagsDisponiveis] = React.useState<
    { id: string; nome: string }[]
  >([]);
  const [pipelinesDisponiveis, setPipelinesDisponiveis] = React.useState<
    { id: string; nome: string }[]
  >([]);
  const [etapasDisponiveis, setEtapasDisponiveis] = React.useState<
    { id: string; nome: string; pipelineId: string }[]
  >([]);
  const [numeroSelecionado, setNumeroSelecionado] = React.useState<string | null>(
    null
  );
  const [pipelineSelecionado, setPipelineSelecionado] =
    React.useState<string | null>(null);
  const [etapaSelecionada, setEtapaSelecionada] = React.useState<string | null>(
    null
  );
  const [pausarTags, setPausarTags] = React.useState<string[]>([]);
  const [pausarEtapas, setPausarEtapas] = React.useState<string[]>([]);
  const [tagEmSelecao, setTagEmSelecao] = React.useState("");
  const [etapaEmSelecao, setEtapaEmSelecao] = React.useState("");
  const [pausarHumano, setPausarHumano] = React.useState(true);
  const [timezone, setTimezone] = React.useState("America/Sao_Paulo");
  const [tempoResposta, setTempoResposta] = React.useState(30);
  const [horarioPersonalizado, setHorarioPersonalizado] = React.useState("");
  const [consentimento, setConsentimento] = React.useState(false);
  const [passoAtual, setPassoAtual] = React.useState(0);
  const [maxPasso, setMaxPasso] = React.useState(0);
  const [mensagensTeste, setMensagensTeste] = React.useState<MensagemTeste[]>([]);
  const [mensagemAtual, setMensagemAtual] = React.useState("");
  const [arquivosTeste, setArquivosTeste] = React.useState<
    Array<{
      id: string;
      file: File;
      nome: string;
      tipo: "imagem" | "audio" | "arquivo";
      url?: string;
    }>
  >([]);
  const inputArquivoTesteRef = React.useRef<HTMLInputElement>(null);
  const [gravandoAudio, setGravandoAudio] = React.useState(false);
  const gravadorAudioRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const streamAudioRef = React.useRef<MediaStream | null>(null);
  const mensagensTesteRef = React.useRef<MensagemTeste[]>([]);
  const scrollAreaTesteRef = React.useRef<HTMLDivElement | null>(null);
  const arquivosTesteRef = React.useRef<
    Array<{ id: string; url?: string }>
  >([]);
  const [filtroAuditoriaPeriodo, setFiltroAuditoriaPeriodo] =
    React.useState("30d");
  const [filtroAuditoriaAcao, setFiltroAuditoriaAcao] =
    React.useState("todas");
  const iniciaisUsuario = React.useMemo(() => {
    const nome = usuario?.nome?.trim();
    if (!nome) return "EU";
    return nome
      .split(" ")
      .map((parte) => parte[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [usuario?.nome]);
  const providerBaileys = providerSelecionado === "whatsapp_baileys";
  const formatarNumeroExibicao = React.useCallback(
    (numero: NumeroWhatsapp) => {
      if (providerBaileys) {
        const limpo = limparNumeroWhatsApp(numero.numero);
        return `${numero.nome} • ${limpo || numero.numero}`;
      }
      return `${numero.nome} • ${numero.numero}`;
    },
    [providerBaileys]
  );
  const templateSyncDisabled =
    providerBaileys ||
    sincronizandoTemplates ||
    !workspace?.id ||
    numerosWhatsapp.length === 0;
  const templateSyncLabel = sincronizandoTemplates
    ? "Sincronizando..."
    : "Sincronizar";
  const [avisoProcessamentoAberto, setAvisoProcessamentoAberto] =
    React.useState(false);
  const [estimativaProcessamento, setEstimativaProcessamento] =
    React.useState(0);
  const [modalDiretrizesMetaAberto, setModalDiretrizesMetaAberto] =
    React.useState(false);
  const modalDiretrizesMetaDisparado = React.useRef(false);
  const possuiPendencias = React.useMemo(
    () =>
      arquivosConhecimento.some(
        (arquivo) => arquivo.status === "pendente" || arquivo.status === "processando"
      ),
    [arquivosConhecimento]
  );

  React.useEffect(() => {
    if (agenteId && agenteId !== agenteIdAtual) {
      setAgenteIdAtual(agenteId);
    }
  }, [agenteId, agenteIdAtual]);

  const carregarTemplatesWhatsapp = React.useCallback(
    async (workspaceId?: string) => {
      if (!workspaceId) return [];
      const { data: templates } = await supabaseClient
        .from("whatsapp_templates")
        .select("id, nome, categoria, idioma, status")
        .eq("workspace_id", workspaceId);

      const aprovados = (templates ?? []).filter(
        (item) => (item.status ?? "").toLowerCase() === "approved"
      );

      return aprovados.map((item) => ({
        id: item.id,
        nome: item.nome,
        categoria: item.categoria,
        idioma: item.idioma,
        status: item.status,
      }));
    },
    []
  );

  const handleSincronizarTemplates = async () => {
    if (!workspace?.id) return;
    if (providerBaileys) {
      setErroTemplates("Templates indisponíveis para API não oficial.");
      return;
    }
    if (numerosWhatsapp.length === 0) {
      setErroTemplates("Conecte um numero WhatsApp para sincronizar.");
      return;
    }

    setSincronizandoTemplates(true);
    setErroTemplates(null);
    try {
      const response = await fetch(
        "/api/integrations/whatsapp/templates/sync",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: workspace.id,
            integrationAccountId: numeroSelecionado ?? undefined,
          }),
        }
      );

      if (!response.ok) {
        const detalhe = await response.text().catch(() => "");
        throw new Error(detalhe || "Erro ao sincronizar templates.");
      }

      const templatesAtualizados = await carregarTemplatesWhatsapp(workspace.id);
      setTemplatesWhatsapp(templatesAtualizados);
    } catch {
      setErroTemplates("Nao foi possivel sincronizar os templates.");
    } finally {
      setSincronizandoTemplates(false);
    }
  };
  React.useEffect(() => {
    if (!usuario?.id || !workspace?.id) return;

    let ativo = true;

    const carregarDados = async () => {
      try {
        setErro(null);
        setCarregando(true);

        if (!agenteIdConsulta && !modoCriacao) {
          if (ativo) {
            setErro("Agente nao encontrado.");
          }
          return;
        }

        const [{ data: contasWhatsapp }, { data: agentesWorkspace }] =
          await Promise.all([
            supabaseClient
              .from("integration_accounts")
              .select(
                "id, nome, identificador, phone_number_id, waba_id, provider, numero, status, instance_id, connected_at, integrations!inner(canal, status, workspace_id)"
              )
              .eq("integrations.canal", "whatsapp")
              .eq("integrations.workspace_id", workspace.id)
              .eq("integrations.status", "conectado")
              .eq("status", "conectado"),
            supabaseClient
              .from("agents")
              .select("id, integration_account_id")
              .eq("workspace_id", workspace.id),
          ]);

        const idsEmUso = new Set(
          (agentesWorkspace ?? [])
            .filter((agente) => agente.integration_account_id)
            .filter((agente) => agente.id !== agenteIdConsulta)
            .map((agente) => agente.integration_account_id as string)
        );

        const numeros = (contasWhatsapp ?? []).map((conta) => ({
          id: conta.id,
          nome: conta.nome ?? "WhatsApp",
          numero:
            conta.numero ??
            conta.identificador ??
            conta.phone_number_id ??
            "WhatsApp",
          phoneNumberId: conta.phone_number_id ?? "",
          wabaId: conta.waba_id ?? undefined,
          provider: conta.provider ?? null,
          status: conta.status ?? null,
          instanceId: conta.instance_id ?? null,
          connectedAt: conta.connected_at ?? null,
          emUso: idsEmUso.has(conta.id),
        }));
        let numerosFiltrados = providerSelecionado
          ? numeros.filter((conta) =>
              providerSelecionado === "whatsapp_oficial"
                ? !conta.provider || conta.provider === "whatsapp_oficial"
                : conta.provider === providerSelecionado
            )
          : numeros;
        if (providerSelecionado === "whatsapp_baileys" && numerosFiltrados.length > 1) {
          numerosFiltrados = [...numerosFiltrados].sort((a, b) => {
            const aTime = a.connectedAt ? Date.parse(a.connectedAt) : 0;
            const bTime = b.connectedAt ? Date.parse(b.connectedAt) : 0;
            return bTime - aTime;
          });
          numerosFiltrados = numerosFiltrados.slice(0, 1);
        }
        if (ativo) {
          setNumerosWhatsapp(numerosFiltrados);
        }

        if (!providerBaileys) {
          const templatesCarregados = await carregarTemplatesWhatsapp(workspace.id);
          if (ativo) {
            setTemplatesWhatsapp(templatesCarregados);
          }
        } else if (ativo) {
          setTemplatesWhatsapp([]);
        }

        const { data: tags } = await supabaseClient
          .from("tags")
          .select("id, nome")
          .eq("workspace_id", workspace.id);
        if (ativo) {
          setTagsDisponiveis(tags ?? []);
        }
        if (ativo && modoCriacao && tags?.length) {
          const tagPadrao = tags.find(
            (tag) => tag.nome?.trim().toLowerCase() === "atendimento humano"
          );
          if (tagPadrao) {
            setPausarTags((atual) => (atual.length ? atual : [tagPadrao.id]));
          }
        }

        const { data: pipelines } = await supabaseClient
          .from("pipelines")
          .select("id, nome")
          .eq("workspace_id", workspace.id);
        if (ativo) {
          setPipelinesDisponiveis(pipelines ?? []);
        }

        if (pipelines?.length) {
          const { data: etapas } = await supabaseClient
            .from("pipeline_stages")
            .select("id, nome, pipeline_id")
            .in(
              "pipeline_id",
              pipelines.map((pipe) => pipe.id)
            );
          if (ativo) {
            setEtapasDisponiveis(
              (etapas ?? []).map((etapa) => ({
                id: etapa.id,
                nome: etapa.nome,
                pipelineId: etapa.pipeline_id,
              }))
            );
          }
          if (ativo && modoCriacao && etapas?.length) {
            const etapaPadrao = etapas.find(
              (etapa) => etapa.nome?.trim().toLowerCase() === "atendimento humano"
            );
            if (etapaPadrao) {
              setPausarEtapas((atual) =>
                atual.length ? atual : [etapaPadrao.id]
              );
            }
          }
        }

        const { data: integracoesCalendario } = await supabaseClient
          .from("calendar_integrations")
          .select("id, provider, primary_calendar_id")
          .eq("workspace_id", workspace.id)
          .eq("user_id", usuario.id)
          .eq("status", "conectado");

        const integrationIds =
          integracoesCalendario?.map((item) => item.id) ?? [];
        const { data: calendariosSync } = integrationIds.length
          ? await supabaseClient
              .from("calendar_sync_state")
              .select("integration_id, calendar_id")
              .in("integration_id", integrationIds)
          : { data: [] };

        if (ativo) {
          const agendas: AgendaAgente[] = [];
          (integracoesCalendario ?? []).forEach((integracao) => {
            if (integracao.primary_calendar_id) {
              agendas.push({
                id: integracao.primary_calendar_id,
                titulo: "Agenda principal",
                provider: "google",
                primaria: true,
                integrationId: integracao.id,
              });
            }
          });
          (calendariosSync ?? []).forEach((sync) => {
            if (!agendas.find((item) => item.id === sync.calendar_id)) {
              agendas.push({
                id: sync.calendar_id,
                titulo: sync.calendar_id,
                provider: "google",
                integrationId: sync.integration_id,
              });
            }
          });
          setAgendasDisponiveis(agendas);
        }

        if (agenteIdConsulta) {
          const { data: agente, error: agenteError } = await supabaseClient
            .from("agents")
            .select("*")
            .eq("id", agenteIdConsulta)
            .eq("workspace_id", workspace.id)
            .maybeSingle();

          if (agenteError || !agente) {
            if (ativo) {
              setErro("Agente nao encontrado.");
            }
            return;
          }

          const configuracao = (agente.configuracao ?? {}) as Record<
            string,
            unknown
          >;

          if (ativo) {
            const canalConfig: CanalId = "whatsapp";
            setFormAgente((atual) => ({
              ...atual,
              id: agente.id,
              nome: agente.nome,
              tipo: agente.tipo,
              status: agente.status,
              canais: [canalConfig],
              tom: (configuracao.tom as TomAgente) ?? atual.tom,
              horario:
                (configuracao.horario as AgenteIA["horario"]) ?? atual.horario,
            }));
            setTomPersonalizado((configuracao.tom_custom as string) ?? "");
            setFaq((configuracao.faq as string) ?? "");
            setPromptAgente((configuracao.prompt as string) ?? "");
            setHorarioPersonalizado(
              (configuracao.horario_customizado as string) ?? ""
            );
            setCanalSelecionado(canalConfig);
            setNumeroSelecionado(agente.integration_account_id ?? null);
            const contaAtual = numeros.find(
              (conta) => conta.id === agente.integration_account_id
            );
            if (contaAtual?.provider) {
              setProviderSelecionado(contaAtual.provider as ProviderAgente);
            }
            setPipelineSelecionado(agente.pipeline_id ?? null);
            setEtapaSelecionada(agente.etapa_inicial_id ?? null);
            setTimezone(agente.timezone ?? "America/Sao_Paulo");
            setTempoResposta(agente.tempo_resposta_segundos ?? 30);
            setPausarTags(agente.pausar_em_tags ?? []);
            setPausarEtapas(agente.pausar_em_etapas ?? []);
            setPausarHumano(agente.pausar_ao_responder_humano ?? true);
          }

          const { data: permissoesDb } = await supabaseClient
            .from("agent_permissions")
            .select("acao, habilitado")
            .eq("agent_id", agenteIdConsulta);

          if (ativo && permissoesDb) {
            setPermissoes((atual) => {
              const proximo = { ...atual };
              permissoesDb.forEach((permissao) => {
                proximo[permissao.acao] = permissao.habilitado;
              });
              return proximo;
            });
          }

          const { data: knowledgeFiles } = await supabaseClient
            .from("agent_knowledge_files")
            .select("id, nome, status, storage_path, mime_type")
            .eq("agent_id", agenteIdConsulta);

          if (ativo) {
            setArquivosConhecimento(
              (knowledgeFiles ?? []).map((arquivo) => ({
                id: arquivo.id,
                nome: arquivo.nome,
                tipo: resolverTipoArquivo(arquivo.nome, arquivo.mime_type ?? undefined),
                status: arquivo.status,
                storagePath: arquivo.storage_path,
              }))
            );
          }

          const { data: logs } = await supabaseClient
            .from("agent_logs")
            .select("id, resumo, created_at")
            .eq("agent_id", agenteIdConsulta)
            .order("created_at", { ascending: false });

          if (ativo) {
            setLogsAuditoria(
              (logs ?? []).map((log) => ({
                id: log.id,
                data: new Date(log.created_at).toLocaleString("pt-BR"),
                resumo: log.resumo,
                createdAt: log.created_at,
              }))
            );
          }

          const { data: followupsDb } = await supabaseClient
            .from("agent_followups")
            .select(
              "id, nome, delay_minutos, template_id, mensagem_texto, habilitado, usar_template, somente_fora_janela"
            )
            .eq("agent_id", agenteIdConsulta)
            .order("ordem", { ascending: true });
          if (ativo) {
            setFollowups(
              (followupsDb ?? []).map((item) => ({
                id: item.id,
                nome: item.nome,
                delayMinutos: item.delay_minutos,
                templateId: item.template_id ?? undefined,
                mensagemTexto: item.mensagem_texto ?? undefined,
                ativo: item.habilitado,
                usarTemplate: item.usar_template ?? Boolean(item.template_id),
                somenteForaJanela: item.somente_fora_janela ?? false,
              }))
            );
          }

          const { data: consent } = await supabaseClient
            .from("agent_consents")
            .select("id")
            .eq("agent_id", agenteIdConsulta)
            .eq("user_id", usuario.id)
            .maybeSingle();
          if (ativo) {
            setConsentimento(Boolean(consent?.id));
          }

          const { data: calendarLinks } = await supabaseClient
            .from("agent_calendar_links")
            .select("calendar_id")
            .eq("agent_id", agenteIdConsulta);
          if (ativo) {
            setAgendasSelecionadas(
              (calendarLinks ?? []).map((item) => item.calendar_id)
            );
          }
        }
      } catch (error) {
        if (ativo) {
          setErro("Nao foi possivel carregar as configuracoes.");
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    };

    carregarDados();

    return () => {
      ativo = false;
    };
  }, [
    usuario?.id,
    workspace?.id,
    agenteIdConsulta,
    modoCriacao,
    carregarTemplatesWhatsapp,
    providerSelecionado,
    providerBaileys,
  ]);

  React.useEffect(() => {
    if (!numeroSelecionado) return;
    const contaAtual = numerosWhatsapp.find(
      (conta) => conta.id === numeroSelecionado
    );
    if (contaAtual?.provider) {
      setProviderSelecionado(contaAtual.provider as ProviderAgente);
    }
  }, [numeroSelecionado, numerosWhatsapp]);

  React.useEffect(() => {
    if (!agenteIdAtual || !possuiPendencias) return;
    let ativo = true;

    const atualizarArquivos = async () => {
      const { data: arquivos } = await supabaseClient
        .from("agent_knowledge_files")
        .select("id, nome, status, storage_path, mime_type")
        .eq("agent_id", agenteIdAtual);
      if (!ativo || !arquivos) return;
      setArquivosConhecimento(
        arquivos.map((arquivo) => ({
          id: arquivo.id,
          nome: arquivo.nome,
          tipo: resolverTipoArquivo(arquivo.nome, arquivo.mime_type ?? undefined),
          status: arquivo.status,
          storagePath: arquivo.storage_path ?? undefined,
        }))
      );
    };

    atualizarArquivos();
    const interval = setInterval(atualizarArquivos, 10000);
    return () => {
      ativo = false;
      clearInterval(interval);
    };
  }, [agenteIdAtual, possuiPendencias]);

  React.useEffect(() => {
    if (!agenteIdAtual || arquivosConhecimento.length === 0) return;
    const todosProntos = arquivosConhecimento.every(
      (arquivo) => arquivo.status === "pronto"
    );
    if (!todosProntos || typeof window === "undefined") return;
    const chave = `vpcrm:knowledge-ready:${agenteIdAtual}`;
    const totalRegistrado = Number(localStorage.getItem(chave) ?? 0);
    if (arquivosConhecimento.length <= totalRegistrado) return;
    localStorage.setItem(chave, String(arquivosConhecimento.length));
    adicionarNotificacao({
      id: `knowledge-ready-${agenteIdAtual}-${Date.now()}`,
      titulo: "Processamento concluído",
      descricao: `Todos os arquivos do agente ${formAgente.nome || "sem nome"} estão prontos.`,
      tempo: "Agora",
      categoria: "Agentes",
      nova: true,
    });
  }, [agenteIdAtual, arquivosConhecimento, formAgente.nome]);

  const handleTogglePermissao = (id: string, habilitado: boolean) => {
    setPermissoes((atual) => ({ ...atual, [id]: habilitado }));
  };

  const handleSelecionarCanal = (_canal: CanalId) => {
    const canalEfetivo: CanalId = "whatsapp";
    setCanalSelecionado(canalEfetivo);
    setFormAgente((atual) => ({
      ...atual,
      canais: [canalEfetivo],
    }));
  };

  const handleAdicionarTagPausa = (tagId: string) => {
    setPausarTags((atual) =>
      atual.includes(tagId) ? atual : [...atual, tagId]
    );
  };

  const handleRemoverTagPausa = (tagId: string) => {
    setPausarTags((atual) => atual.filter((item) => item !== tagId));
  };

  const handleAdicionarEtapaPausa = (etapaId: string) => {
    setPausarEtapas((atual) =>
      atual.includes(etapaId) ? atual : [...atual, etapaId]
    );
  };

  const handleRemoverEtapaPausa = (etapaId: string) => {
    setPausarEtapas((atual) => atual.filter((item) => item !== etapaId));
  };

  const handleAdicionarAgenda = (agendaId: string) => {
    setAgendasSelecionadas((atual) =>
      atual.includes(agendaId) ? atual : [...atual, agendaId]
    );
  };

  const handleRemoverAgenda = (agendaId: string) => {
    setAgendasSelecionadas((atual) => atual.filter((item) => item !== agendaId));
  };

  const handleAdicionarFollowup = () => {
    const novo: FollowupAgente = {
      id: crypto.randomUUID(),
      nome: "Novo follow-up",
      delayMinutos: 30,
      ativo: true,
      usarTemplate: true,
      somenteForaJanela: false,
    };
    setFollowups((atual) => [...atual, novo]);
  };

  const handleAtualizarFollowup = (id: string, valores: Partial<FollowupAgente>) => {
    setFollowups((atual) =>
      atual.map((item) => (item.id === id ? { ...item, ...valores } : item))
    );
  };

  const handleRemoverFollowup = (id: string) => {
    setFollowups((atual) => atual.filter((item) => item.id !== id));
  };

  const persistirAgente = async (redirecionar: boolean) => {
    if (!formAgente.nome.trim() || !workspace?.id || !usuario) {
      setErro("Preencha o nome do agente antes de salvar.");
      return null;
    }
    setSalvando(true);
    setErro(null);

    const configuracao = {
      tom: formAgente.tom,
      tom_custom: formAgente.tom === "outro" ? tomPersonalizado : null,
      horario: formAgente.horario,
      horario_customizado:
        formAgente.horario === "personalizado" ? horarioPersonalizado : null,
      canais: [canalSelecionado],
      faq,
      prompt: promptAgente,
    };

    const contaSelecionada = numeroSelecionado;

    const payload = {
      workspace_id: workspace.id,
      nome: formAgente.nome,
      tipo: formAgente.tipo,
      status: formAgente.status,
      integration_account_id: contaSelecionada,
      pipeline_id: pipelineSelecionado,
      etapa_inicial_id: etapaSelecionada,
      detectar_idioma: true,
      idioma_padrao: "pt-BR",
      timezone,
      tempo_resposta_segundos: tempoResposta,
      pausar_em_tags: pausarTags.length ? pausarTags : null,
      pausar_em_etapas: pausarEtapas.length ? pausarEtapas : null,
      pausar_ao_responder_humano: pausarHumano,
      configuracao,
      criado_por: usuario.id,
    };

    let agenteIdPersistido = agenteIdAtual;
    if (agenteIdPersistido) {
      const { error } = await supabaseClient
        .from("agents")
        .update(payload)
        .eq("id", agenteIdPersistido);
      if (error) {
        const conflitoNome =
          error.code === "23505" ||
          error.message?.includes("duplicate key") ||
          error.details?.includes("(workspace_id, nome)");
        setErro(
          conflitoNome
            ? "Já existe um agente com esse nome. Escolha outro nome."
            : "Nao foi possivel salvar o agente."
        );
        setSalvando(false);
        return null;
      }
    } else {
      const { data, error } = await supabaseClient
        .from("agents")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        const conflitoNome =
          error?.code === "23505" ||
          error?.message?.includes("duplicate key") ||
          error?.details?.includes("(workspace_id, nome)");
        setErro(
          conflitoNome
            ? "Já existe um agente com esse nome. Escolha outro nome."
            : "Nao foi possivel criar o agente."
        );
        setSalvando(false);
        return null;
      }
      agenteIdPersistido = data.id;
      setAgenteIdAtual(data.id);
    }

    const permissoesPayload = permissoesBase.map((item) => ({
      agent_id: agenteIdPersistido,
      acao: item.id,
      habilitado: Boolean(permissoes[item.id]),
    }));
    await supabaseClient.from("agent_permissions").upsert(permissoesPayload);
    await supabaseClient
      .from("agent_permissions")
      .delete()
      .eq("agent_id", agenteIdPersistido)
      .in("acao", [
        "criar_lead",
        "editar_lead",
        "alterar_campo_customizado",
        "follow_up",
      ]);

    await supabaseClient
      .from("agent_followups")
      .delete()
      .eq("agent_id", agenteIdPersistido);
    if (followups.length) {
      await supabaseClient.from("agent_followups").insert(
        followups.map((item, index) => {
          const usarTemplate = providerBaileys
            ? false
            : item.usarTemplate ?? Boolean(item.templateId);
          return {
            agent_id: agenteIdPersistido,
            nome: item.nome,
            delay_minutos: item.delayMinutos,
            template_id: usarTemplate ? item.templateId ?? null : null,
            mensagem_texto: item.mensagemTexto ?? null,
            habilitado: item.ativo,
            usar_template: usarTemplate,
            somente_fora_janela: item.somenteForaJanela ?? false,
            ordem: index + 1,
          };
        })
      );
    }

    await supabaseClient
      .from("agent_calendar_links")
      .delete()
      .eq("agent_id", agenteIdPersistido);
    if (agendasSelecionadas.length) {
      const agendaMap = new Map(
        agendasDisponiveis
          .filter((agenda) => agenda.integrationId)
          .map((agenda) => [agenda.id, agenda.integrationId])
      );
      const payload = agendasSelecionadas
        .map((calendarId) => ({
          agent_id: agenteIdPersistido,
          integration_id: agendaMap.get(calendarId),
          calendar_id: calendarId,
        }))
        .filter((item) => item.integration_id);
      if (payload.length) {
        await supabaseClient.from("agent_calendar_links").insert(payload);
      }
    }

    if (consentimento && agenteIdPersistido) {
      await supabaseClient.from("agent_consents").upsert({
        agent_id: agenteIdPersistido,
        user_id: usuario.id,
      });
    }

    setSalvando(false);
    if (redirecionar) {
      router.push("/app/agentes");
    }
    return agenteIdPersistido;
  };

  const resolverTipoArquivo = (
    nome: string,
    mimeType?: string
  ): ArquivoConhecimento["tipo"] => {
    const nomeLower = nome.toLowerCase();
    if (mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/i.test(nomeLower)) {
      return "imagem";
    }
    if (nomeLower.endsWith(".pdf")) return "pdf";
    if (nomeLower.endsWith(".docx")) return "docx";
    if (nomeLower.endsWith(".txt")) return "txt";
    return "pdf";
  };

  const statusArquivoConfig: Record<
    ArquivoConhecimento["status"],
    {
      label: string;
      className: string;
      etapa: number;
      tom: "success" | "warning" | "error";
      descricao: string;
    }
  > = {
    pendente: {
      label: "Aguardando processamento",
      className: "border-amber-200/70 bg-amber-500/10 text-amber-700",
      etapa: 1,
      tom: "warning",
      descricao: "Upload concluído. Processamento pendente.",
    },
    processando: {
      label: "Processando",
      className: "border-amber-200/70 bg-amber-500/10 text-amber-700",
      etapa: 1,
      tom: "warning",
      descricao: "Extraindo texto e gerando embeddings.",
    },
    pronto: {
      label: "Concluido",
      className: "border-emerald-200/70 bg-emerald-500/10 text-emerald-700",
      etapa: 2,
      tom: "success",
      descricao: "Arquivo pronto para uso nas respostas.",
    },
    erro: {
      label: "Erro",
      className: "border-red-200/70 bg-red-500/10 text-red-700",
      etapa: 1,
      tom: "error",
      descricao: "Falha ao processar. Envie novamente.",
    },
  };

  const handleUploadConhecimento = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivos = Array.from(event.target.files ?? []);
    if (arquivos.length === 0) return;
    if (!workspace?.id || !usuario) {
      setErro("Nao foi possivel validar o workspace.");
      event.target.value = "";
      return;
    }

    let agenteIdUpload = agenteIdAtual;
    setErro(null);
    if (!agenteIdUpload) {
      const novoId = await persistirAgente(false);
      if (!novoId) {
        event.target.value = "";
        return;
      }
      agenteIdUpload = novoId;
    }

    try {
      const restante = 10 - arquivosConhecimento.length;
      const arquivosSelecionados = arquivos.slice(0, Math.max(restante, 0));
      const tamanhoMaximo = 5 * 1024 * 1024;

      if (
        arquivosConhecimento.length === 0 &&
        typeof window !== "undefined" &&
        agenteIdUpload
      ) {
        const chaveAviso = `vpcrm:knowledge-first-upload:${agenteIdUpload}`;
        if (!localStorage.getItem(chaveAviso)) {
          const tamanhoTotal = arquivosSelecionados.reduce(
            (total, item) => total + item.size,
            0
          );
          setEstimativaProcessamento(estimarMinutosProcessamento(tamanhoTotal));
          setAvisoProcessamentoAberto(true);
          localStorage.setItem(chaveAviso, "true");
        }
      }

      if (arquivosSelecionados.length < arquivos.length) {
        setErro("Limite maximo de 10 arquivos atingido.");
        return;
      }

      for (const arquivo of arquivosSelecionados) {
        if (arquivo.size > tamanhoMaximo) {
          setErro("Arquivo acima de 5MB. Envie um arquivo menor.");
          continue;
        }
        const nomeArquivo = normalizarNomeArquivo(arquivo.name);
        const storagePath = `${agenteIdUpload}/${Date.now()}-${nomeArquivo}`;
        const upload = await supabaseClient.storage
          .from("agent-knowledge")
          .upload(storagePath, arquivo, { upsert: false });
        if (upload.error) {
          setErro("Nao foi possivel enviar o arquivo.");
          continue;
        }

        const { data: arquivoDb, error } = await supabaseClient
          .from("agent_knowledge_files")
          .insert({
            agent_id: agenteIdUpload,
            workspace_id: workspace.id,
            criado_por: usuario.id,
            nome: arquivo.name,
            mime_type: arquivo.type,
            storage_path: storagePath,
            tamanho_bytes: arquivo.size,
            status: "pendente",
          })
          .select("id, nome, status")
          .single();

        if (error || !arquivoDb) {
          setErro("Nao foi possivel registrar o arquivo.");
          continue;
        }

        setArquivosConhecimento((atual) => [
          ...atual,
          {
            id: arquivoDb.id,
            nome: arquivoDb.nome,
            tipo: resolverTipoArquivo(arquivo.name, arquivo.type),
            status: arquivoDb.status,
            storagePath: storagePath,
          },
        ]);

        const respostaProcessamento = await fetch("/api/agentes/conhecimento/processar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agenteIdUpload, fileId: arquivoDb.id }),
        });
        let statusResposta: string | undefined;
        try {
          const data = await respostaProcessamento.json();
          if (data && typeof data.status === "string") {
            statusResposta = data.status;
          }
        } catch {
          statusResposta = undefined;
        }

        if (!respostaProcessamento.ok || statusResposta === "error") {
          setArquivosConhecimento((atual) =>
            atual.map((item) =>
              item.id === arquivoDb.id ? { ...item, status: "erro" } : item
            )
          );
          await supabaseClient
            .from("agent_knowledge_files")
            .update({ status: "erro" })
            .eq("id", arquivoDb.id);
          continue;
        }

        if (statusResposta === "pending") {
          continue;
        }

        const { data: arquivoAtualizado } = await supabaseClient
          .from("agent_knowledge_files")
          .select("status")
          .eq("id", arquivoDb.id)
          .maybeSingle();
        if (arquivoAtualizado?.status) {
          setArquivosConhecimento((atual) =>
            atual.map((item) =>
              item.id === arquivoDb.id
                ? { ...item, status: arquivoAtualizado.status }
                : item
            )
          );
        }
      }
    } catch {
      setErro("Nao foi possivel enviar os arquivos.");
    } finally {
      event.target.value = "";
    }
  };

  const [enviandoTeste, setEnviandoTeste] = React.useState(false);

  const handleSelecionarArquivosTeste = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivos = Array.from(event.target.files ?? []);
    if (!arquivos.length) return;
    const novos = arquivos.map((file) => {
      const tipo = file.type.startsWith("image/")
        ? "imagem"
        : file.type.startsWith("audio/")
          ? "audio"
          : "arquivo";
      const url =
        tipo === "imagem" || tipo === "audio" ? URL.createObjectURL(file) : undefined;
      return {
        id: `${file.name}-${file.size}-${Date.now()}`,
        file,
        nome: file.name,
        tipo,
        url,
      };
    });
    setArquivosTeste((atual) => [...atual, ...novos]);
    event.target.value = "";
  };

  const handleRemoverArquivoTeste = (id: string) => {
    setArquivosTeste((atual) => {
      const alvo = atual.find((item) => item.id === id);
      if (alvo?.url) {
        URL.revokeObjectURL(alvo.url);
      }
      return atual.filter((item) => item.id !== id);
    });
  };

  const handleAlternarGravacao = async () => {
    if (gravandoAudio) {
      gravadorAudioRef.current?.stop();
      setGravandoAudio(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamAudioRef.current = stream;
      const recorder = new MediaRecorder(stream);
      gravadorAudioRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const arquivo = new File([blob], `audio-${Date.now()}.webm`, {
          type: mimeType,
        });
        const url = URL.createObjectURL(blob);
        setArquivosTeste((atual) => [
          ...atual,
          {
            id: `${arquivo.name}-${arquivo.size}-${Date.now()}`,
            file: arquivo,
            nome: arquivo.name,
            tipo: "audio",
            url,
          },
        ]);
        stream.getTracks().forEach((track) => track.stop());
        streamAudioRef.current = null;
        gravadorAudioRef.current = null;
      };

      recorder.start();
      setGravandoAudio(true);
    } catch (error) {
      adicionarNotificacao({
        titulo: "Nao foi possivel gravar audio.",
        descricao: "Verifique a permissao do microfone e tente novamente.",
        categoria: "Agentes",
      });
    }
  };

  const handleRemoverArquivo = async (id: string) => {
    const arquivo = arquivosConhecimento.find((item) => item.id === id);
    setArquivosConhecimento((atual) => atual.filter((item) => item.id !== id));
    await supabaseClient.from("agent_knowledge_files").delete().eq("id", id);
    if (arquivo?.storagePath) {
      await supabaseClient.storage
        .from("agent-knowledge")
        .remove([arquivo.storagePath]);
    }
  };

  const handleEnviarTeste = async () => {
    if ((!mensagemAtual.trim() && arquivosTeste.length === 0) || !agenteIdAtual) {
      return;
    }
    const texto = mensagemAtual.trim();
    const anexos = arquivosTeste.map((arquivo) => ({
      id: arquivo.id,
      nome: arquivo.nome,
      tipo: arquivo.tipo,
      url: arquivo.url,
    }));
    const novaMensagem = {
      id: `msg-${Date.now()}`,
      autor: "usuario",
      texto,
      anexos,
    } satisfies MensagemTeste;
    const historico = [...mensagensTeste, novaMensagem];
    setMensagensTeste(historico);
    setMensagemAtual("");
    setEnviandoTeste(true);

    try {
      let resposta: Response;
      const payloadMensagens = historico.map((mensagem) => ({
        role: mensagem.autor === "usuario" ? "user" : "assistant",
        content:
          mensagem.texto || (mensagem.anexos?.length ? "Arquivo enviado." : ""),
      }));

      if (arquivosTeste.length > 0) {
        const formData = new FormData();
        formData.append("agentId", agenteIdAtual);
        if (texto) {
          formData.append("message", texto);
        }
        formData.append("messages", JSON.stringify(payloadMensagens));
        arquivosTeste.forEach((arquivo) => {
          formData.append("files", arquivo.file, arquivo.nome);
        });

        resposta = await fetch(`/api/agentes/sandbox?agentId=${agenteIdAtual}`, {
          method: "POST",
          body: formData,
        });
      } else {
        resposta = await fetch("/api/agentes/sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agenteIdAtual,
            messages: payloadMensagens,
          }),
        });
      }

      if (!resposta.ok) {
        throw new Error("Sandbox failure");
      }
      const data = await resposta.json();
      const respostaTexto =
        data?.output || "Nao foi possivel gerar resposta.";
      setMensagensTeste((atual) => [
        ...atual,
        {
          id: `msg-${Date.now()}-bot`,
          autor: "agente",
          texto: respostaTexto,
        },
      ]);
    } catch {
      setMensagensTeste((atual) => [
        ...atual,
        {
          id: `msg-${Date.now()}-bot`,
          autor: "agente",
          texto: "Nao foi possivel conectar ao agente.",
        },
      ]);
    } finally {
      setEnviandoTeste(false);
      setArquivosTeste([]);
    }
  };

  const handleResetarTeste = () => {
    setMensagensTeste((atual) => {
      atual.forEach((mensagem) => {
        mensagem.anexos?.forEach((anexo) => {
          if (anexo.url) URL.revokeObjectURL(anexo.url);
        });
      });
      return [];
    });
    setMensagemAtual("");
    setArquivosTeste((atual) => {
      atual.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
      return [];
    });
  };

  const podeEnviarTeste =
    Boolean(agenteIdAtual) &&
    !enviandoTeste &&
    !gravandoAudio &&
    (mensagemAtual.trim().length > 0 || arquivosTeste.length > 0);
  const rolarChatTestes = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const viewport = scrollAreaTesteRef.current?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      );
      if (!viewport) return;
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    },
    []
  );

  const renderSandboxChat = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Testes do agente</p>
          <p className="text-xs text-muted-foreground">
            Envie mensagens e valide respostas antes de publicar.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleResetarTeste}>
          Resetar conversa
        </Button>
      </div>
      {!agenteIdAtual && (
        <div className="rounded-[6px] border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          Salve o agente para habilitar o sandbox de testes.
        </div>
      )}
      <div className="flex h-[580px] flex-col rounded-[6px] border border-border/60 bg-background/70">
        <div ref={scrollAreaTesteRef} className="flex-1 min-h-0">
          <ScrollArea className="h-full" type="always">
            <div className="space-y-3 p-4">
            {mensagensTeste.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                Inicie uma conversa para testar o agente.
              </p>
            ) : (
              mensagensTeste.map((mensagem) => (
                <div
                  key={mensagem.id}
                  className={cn(
                    "flex items-end gap-2",
                    mensagem.autor === "usuario" ? "justify-end" : "justify-start"
                  )}
                >
                  {mensagem.autor === "agente" && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-border/60 bg-muted/40 text-muted-foreground">
                      <Brain className="h-4 w-4" />
                    </span>
                  )}
                  <div
                    className={cn(
                      "inline-flex w-fit max-w-[82%] flex-col space-y-2 rounded-[6px] px-3 py-2 text-sm whitespace-pre-wrap break-words",
                      mensagem.autor === "usuario"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {mensagem.texto ? <p>{mensagem.texto}</p> : null}
                    {mensagem.anexos?.length ? (
                      <div className="space-y-2 pt-1">
                        {mensagem.anexos.map((anexo) => (
                          <div key={anexo.id} className="space-y-2">
                            {anexo.tipo === "imagem" && anexo.url && (
                              <img
                                src={anexo.url}
                                alt={anexo.nome}
                                className="max-h-40 rounded-[6px] border border-border/40"
                              />
                            )}
                            {anexo.tipo === "audio" && anexo.url && (
                              <audio controls className="w-full">
                                <source src={anexo.url} />
                              </audio>
                            )}
                            <div className="flex items-center gap-2 text-xs opacity-80">
                              {anexo.tipo === "imagem" ? (
                                <ImageIcon className="h-3.5 w-3.5" />
                              ) : anexo.tipo === "audio" ? (
                                <Mic className="h-3.5 w-3.5" />
                              ) : (
                                <Paperclip className="h-3.5 w-3.5" />
                              )}
                              <span className="truncate">
                                {anexo.tipo === "audio" ? "Áudio" : anexo.nome}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {mensagem.autor === "usuario" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      {usuario?.avatarUrl && (
                        <AvatarImage src={usuario.avatarUrl} alt={usuario.nome} />
                      )}
                      <AvatarFallback>{iniciaisUsuario}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            {enviandoTeste && (
              <div className="flex items-end gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-border/60 bg-muted/40 text-muted-foreground">
                  <Brain className="h-4 w-4" />
                </span>
                <div className="inline-flex w-fit max-w-[82%] items-center gap-1 rounded-[6px] bg-muted px-3 py-2 text-sm">
                  <span
                    className="h-2 w-2 rounded-[6px] bg-muted-foreground/70 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 rounded-[6px] bg-muted-foreground/70 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 rounded-[6px] bg-muted-foreground/70 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
        <div className="sticky bottom-0 border-t border-border/60 bg-background/90 p-3 backdrop-blur">
          {arquivosTeste.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {arquivosTeste.map((arquivo) => (
                <div
                  key={arquivo.id}
                  className="flex items-center gap-2 rounded-[6px] border border-border/60 bg-muted/40 px-3 py-1 text-xs"
                >
                  {arquivo.tipo === "imagem" ? (
                    <ImageIcon className="h-3.5 w-3.5" />
                  ) : arquivo.tipo === "audio" ? (
                    <Mic className="h-3.5 w-3.5" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5" />
                  )}
                  <span className="max-w-[140px] truncate">
                    {arquivo.tipo === "audio" ? "Áudio" : arquivo.nome}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleRemoverArquivoTeste(arquivo.id)}
                    aria-label="Remover anexo"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={inputArquivoTesteRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,audio/*,application/pdf"
              onChange={handleSelecionarArquivosTeste}
            />
            <div className="relative flex-1">
              <Textarea
                value={mensagemAtual}
                onChange={(event) => setMensagemAtual(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    if (podeEnviarTeste) {
                      handleEnviarTeste();
                    }
                  }
                }}
                placeholder="Digite uma mensagem para o agente..."
                className="min-h-[72px] max-h-[160px] resize-none overflow-y-auto pr-32 break-words"
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-[6px]"
                      onClick={() => inputArquivoTesteRef.current?.click()}
                      aria-label="Anexar arquivo"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">Anexar arquivo</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={gravandoAudio ? "destructive" : "ghost"}
                      size="icon"
                      className="h-9 w-9 rounded-[6px]"
                      onClick={handleAlternarGravacao}
                      aria-label={gravandoAudio ? "Parar gravação" : "Gravar áudio"}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                    {gravandoAudio ? "Parar gravação" : "Gravar áudio"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleEnviarTeste}
                      disabled={!podeEnviarTeste}
                      size="icon"
                      className="h-9 w-9 rounded-[6px]"
                      aria-label="Enviar mensagem"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">Enviar mensagem</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  React.useEffect(() => {
    setMaxPasso((atual) => Math.max(atual, passoAtual));
  }, [passoAtual]);

  React.useEffect(() => {
    return () => {
      mensagensTesteRef.current.forEach((mensagem) => {
        mensagem.anexos?.forEach((anexo) => {
          if (anexo.url) URL.revokeObjectURL(anexo.url);
        });
      });
      arquivosTesteRef.current.forEach((arquivo) => {
        if (arquivo.url) URL.revokeObjectURL(arquivo.url);
      });
      streamAudioRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  React.useEffect(() => {
    mensagensTesteRef.current = mensagensTeste;
  }, [mensagensTeste]);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      rolarChatTestes(mensagensTeste.length > 1 ? "smooth" : "auto");
    });
    return () => cancelAnimationFrame(id);
  }, [mensagensTeste.length, rolarChatTestes]);

  React.useEffect(() => {
    if (!enviandoTeste) return;
    const id = requestAnimationFrame(() => {
      rolarChatTestes("smooth");
    });
    return () => cancelAnimationFrame(id);
  }, [enviandoTeste, rolarChatTestes]);

  React.useEffect(() => {
    arquivosTesteRef.current = arquivosTeste;
  }, [arquivosTeste]);

  const handleVoltarWizard = () => {
    setPassoAtual((atual) => Math.max(0, atual - 1));
  };

  const handleAvancarWizard = () => {
    if (!podeAvancarWizard) return;
    setPassoAtual((atual) =>
      Math.min(wizardSteps.length - 1, atual + 1)
    );
  };

  const handleIrParaPasso = (index: number) => {
    if (usarWizard && !modoCriacao) {
      setPassoAtual(index);
      return;
    }
    if (index <= maxPasso) {
      setPassoAtual(index);
    }
  };

  const renderWizardConteudo = () => {
    switch (passoAtualInfo.id) {
      case "identidade":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Função principal</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {templatesAgente.map((template) => {
                  const Icone = template.icone;
                  const ativo = formAgente.tipo === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() =>
                        setFormAgente((atual) => ({
                          ...atual,
                          tipo: template.id as TipoAgente,
                        }))
                      }
                      className={cn(
                        "flex w-full items-start gap-3 rounded-[6px] border border-border/60 bg-background/80 p-3 text-left text-sm transition",
                        ativo && "border-primary/50 bg-primary/5"
                      )}
                    >
                      <span className="mt-1 rounded-[6px] bg-primary/10 p-2 text-primary">
                        <Icone className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium">{template.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.descricao}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <Separator />
            <div className="grid gap-3">
              <div className="grid gap-2">
                <label htmlFor="agente-nome" className="text-sm font-medium">
                  Nome do agente
                </label>
                <Input
                  id="agente-nome"
                  value={formAgente.nome}
                  onChange={(event) =>
                    setFormAgente((atual) => ({
                      ...atual,
                      nome: event.target.value,
                    }))
                  }
                  placeholder="Ex: Maya SDR"
                />
                <p className="text-xs text-muted-foreground">
                  Este nome sera usado pelo agente ao se apresentar nas conversas.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Tom de voz</label>
                  <Select
                    value={formAgente.tom}
                    onValueChange={(valor) =>
                      setFormAgente((atual) => ({
                        ...atual,
                        tom: valor as TomAgente,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tom" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      {tonsAgente.map((tom) => (
                        <SelectItem key={tom.value} value={tom.value}>
                          {tom.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Horário de atuação</label>
                  <Select
                    value={formAgente.horario}
                    onValueChange={(valor) =>
                      setFormAgente((atual) => ({
                        ...atual,
                        horario: valor as AgenteIA["horario"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o horário" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      {horariosAgente.map((horario) => (
                        <SelectItem key={horario.value} value={horario.value}>
                          {horario.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formAgente.tom === "outro" && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Tom de voz personalizado</label>
                  <Input
                    value={tomPersonalizado}
                    onChange={(event) => setTomPersonalizado(event.target.value)}
                    placeholder="Descreva o tom de voz desejado."
                  />
                </div>
              )}
              {formAgente.horario === "personalizado" && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    Horário personalizado
                  </label>
                  <Input
                    value={horarioPersonalizado}
                    onChange={(event) =>
                      setHorarioPersonalizado(event.target.value)
                    }
                    placeholder="Ex: 08h às 20h"
                  />
                </div>
              )}
            </div>
          </div>
        );
      case "canais":
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Canal ativo</label>
              <Select
                value={canalSelecionado}
                onValueChange={(valor) =>
                  handleSelecionarCanal(valor as CanalId)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o canal" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>Número WhatsApp do agente</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex text-muted-foreground">
                      <CircleHelp className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                    Escolha o número conectado para esse agente.
                  </TooltipContent>
                </Tooltip>
              </div>
              {numerosWhatsapp.length ? (
                <Select
                  value={numeroSelecionado ?? ""}
                  onValueChange={(valor) => setNumeroSelecionado(valor || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um número" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                    {numerosWhatsapp.map((numero) => (
                      <SelectItem
                        key={numero.id}
                        value={numero.id}
                        disabled={numero.emUso}
                      >
                        {formatarNumeroExibicao(numero)}
                        {numero.emUso ? " (em uso)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhum número conectado.
                </p>
              )}
            </div>
          </div>
        );
      case "crm":
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Pipeline principal</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex text-muted-foreground">
                        <CircleHelp className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      Pipeline onde o agente cria e move negócios.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={pipelineSelecionado ?? ""}
                  onValueChange={(valor) => setPipelineSelecionado(valor || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pipeline" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                    {pipelinesDisponiveis.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Etapa inicial</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex text-muted-foreground">
                        <CircleHelp className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      Etapa onde novos leads entram automaticamente.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={etapaSelecionada ?? ""}
                  onValueChange={(valor) => setEtapaSelecionada(valor || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                    {etapasFiltradas.map((etapa) => (
                      <SelectItem key={etapa.id} value={etapa.id}>
                        {etapa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>Agendas disponíveis</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex text-muted-foreground">
                      <CircleHelp className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                    Selecione as agendas que o agente pode usar.
                  </TooltipContent>
                </Tooltip>
              </div>
              {agendasDisponiveis.length ? (
                <div className="space-y-3">
                  <Select
                    value={agendaEmSelecao}
                    onValueChange={(valor) => {
                      handleAdicionarAgenda(valor);
                      setAgendaEmSelecao("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma agenda" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      {agendasDisponiveis.map((agenda) => (
                        <SelectItem key={agenda.id} value={agenda.id}>
                          {agenda.titulo}
                          {agenda.primaria && " • Agenda principal (voce)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {agendasSelecionadas.map((agendaId) => {
                      const agenda = agendasDisponiveis.find(
                        (item) => item.id === agendaId
                      );
                      if (!agenda) return null;
                      return (
                        <Badge
                          key={agendaId}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {agenda.titulo}
                          {agenda.primaria && " (voce)"}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => handleRemoverAgenda(agendaId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                    {agendasSelecionadas.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        Nenhuma agenda selecionada.
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  <span>Nenhuma agenda configurada.</span>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/app/calendario">Configurar agendas</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      case "comportamento":
        return (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Tempo de resposta (segundos)</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex text-muted-foreground">
                        <CircleHelp className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      Define o tempo alvo para responder aos leads.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="number"
                  min={5}
                  value={tempoResposta}
                  onChange={(event) => setTempoResposta(Number(event.target.value || 0))}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Timezone</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex text-muted-foreground">
                        <CircleHelp className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      Usado para horários de atuação e follow-ups.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  placeholder="America/Sao_Paulo"
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>Pausar por tags</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex text-muted-foreground">
                      <CircleHelp className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                    Tags aplicadas no lead ou contato pausam o agente.
                  </TooltipContent>
                </Tooltip>
              </div>
              {tagsDisponiveis.length ? (
                <div className="space-y-3">
                  <Select
                    value={tagEmSelecao}
                    onValueChange={(valor) => {
                      handleAdicionarTagPausa(valor);
                      setTagEmSelecao("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma tag" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      {tagsDisponiveis.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          {tag.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {pausarTags.map((tagId) => {
                      const tag = tagsDisponiveis.find((item) => item.id === tagId);
                      if (!tag) return null;
                      return (
                        <Badge
                          key={tagId}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {tag.nome}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => handleRemoverTagPausa(tagId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                    {pausarTags.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        Nenhuma tag selecionada.
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Nenhuma tag disponível.
                </span>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>Pausar por etapas</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex text-muted-foreground">
                      <CircleHelp className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                    Etapas específicas interrompem o agente automaticamente.
                  </TooltipContent>
                </Tooltip>
              </div>
              {etapasFiltradas.length ? (
                <div className="space-y-3">
                  <Select
                    value={etapaEmSelecao}
                    onValueChange={(valor) => {
                      handleAdicionarEtapaPausa(valor);
                      setEtapaEmSelecao("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma etapa" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      {etapasFiltradas.map((etapa) => (
                        <SelectItem key={etapa.id} value={etapa.id}>
                          {etapa.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {pausarEtapas.map((etapaId) => {
                      const etapa = etapasFiltradas.find((item) => item.id === etapaId);
                      if (!etapa) return null;
                      return (
                        <Badge
                          key={etapaId}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {etapa.nome}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => handleRemoverEtapaPausa(etapaId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                    {pausarEtapas.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        Nenhuma etapa selecionada.
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Nenhuma etapa disponível.
                </span>
              )}
            </div>
          </div>
        );
      case "conhecimento":
        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="space-y-3 rounded-[6px] border border-border/60 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>Prompt do agente</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex text-muted-foreground">
                          <CircleHelp className="h-4 w-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                        Instruções base e limites de atuação do agente.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Expandir prompt">
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      <DialogHeader>
                        <DialogTitle>Prompt do agente</DialogTitle>
                        <DialogDescription>
                          Até {PROMPT_MAX_PALAVRAS} palavras.
                        </DialogDescription>
                      </DialogHeader>
                      <Textarea
                        value={promptAgente}
                        onChange={(event) =>
                          setPromptAgente(
                            limitarTexto(
                              event.target.value,
                              PROMPT_MAX_PALAVRAS,
                              PROMPT_MAX_CARACTERES
                            )
                          )
                        }
                        placeholder="Descreva regras, tom e prioridades do agente."
                        rows={12}
                        maxLength={PROMPT_MAX_CARACTERES}
                        className="h-[60vh] min-h-[320px] resize-none overflow-y-auto [field-sizing:fixed]"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{promptWordCount} / {PROMPT_MAX_PALAVRAS} palavras</span>
                        {promptWordCount === 0 && (
                          <span className="text-destructive">
                            Prompt obrigatório.
                          </span>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="secondary">Concluir</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              <div className="rounded-[6px] border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {promptAgente
                  ? `${promptAgente.slice(0, 240)}${promptAgente.length > 240 ? "…" : ""}`
                  : "Nenhum prompt configurado ainda."}
              </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{promptWordCount} / {PROMPT_MAX_PALAVRAS} palavras</span>
                  <span>Obrigatório</span>
                </div>
              </div>
              <div className="space-y-3 rounded-[6px] border border-border/60 bg-background/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>FAQ / Manual</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex text-muted-foreground">
                        <CircleHelp className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      Respostas rápidas, políticas e scripts internos.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  value={faq}
                  onChange={(event) =>
                    setFaq(
                      limitarTexto(
                        event.target.value,
                        FAQ_MAX_PALAVRAS,
                        FAQ_MAX_CARACTERES
                      )
                    )
                  }
                  placeholder="Adicione instruções, respostas e políticas internas."
                  rows={6}
                  maxLength={FAQ_MAX_CARACTERES}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{faqWordCount} / {FAQ_MAX_PALAVRAS} palavras</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 rounded-[6px] border border-border/60 bg-background/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Arquivos de conhecimento</p>
                  <p className="text-xs text-muted-foreground">
                    Limite de 10 arquivos por agente.
                  </p>
                </div>
                <Badge variant="outline">{arquivosConhecimento.length}/10</Badge>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-[6px] border border-dashed border-border/60 bg-muted/30 p-3 text-sm">
                <UploadCloud className="h-4 w-4" />
                Enviar arquivos
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.txt,.docx,.png,.jpg,.jpeg"
                  onChange={handleUploadConhecimento}
                />
              </label>
              <div className="space-y-2">
                {arquivosConhecimento.map((arquivo) => (
                  <div
                    key={arquivo.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border/60 bg-background/70 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{arquivo.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {arquivo.tipo.toUpperCase()}
                      </p>
                      {(() => {
                        const config = statusArquivoConfig[arquivo.status];
                        return (
                          <p
                            className={cn(
                              "mt-2 text-[11px]",
                              config.tom === "error"
                                ? "text-destructive"
                                : config.tom === "success"
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                            )}
                          >
                            {config.descricao}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={statusArquivoConfig[arquivo.status].className}
                      >
                        {statusArquivoConfig[arquivo.status].label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverArquivo(arquivo.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
                {!arquivosConhecimento.length && (
                  <div className="rounded-[6px] border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    Nenhum arquivo enviado ainda.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "acoes":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-background/70 p-3 text-sm">
              <div>
                <p className="font-medium">Pausar quando humano responde</p>
                <p className="text-xs text-muted-foreground">
                  Interrompe o agente quando alguém da equipe responde.
                </p>
              </div>
              <Switch checked={pausarHumano} onCheckedChange={setPausarHumano} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Permissões por área</p>
              <div className="space-y-4">
                {permissoesPorGrupo.map((grupo, index) => (
                  <React.Fragment key={grupo.titulo}>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {grupo.titulo}
                      </p>
                      <div className="space-y-2">
                        {grupo.ids.map((id) => {
                          const permissao = permissoesMap.get(id);
                          if (!permissao) return null;
                          return (
                            <div
                              key={permissao.id}
                              className="flex items-center justify-between rounded-[6px] border border-border/60 bg-background/70 p-3 text-sm"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{permissao.label}</p>
                                  {descricaoPermissoes[permissao.id] && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex text-muted-foreground">
                                          <CircleHelp className="h-3.5 w-3.5" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                        {descricaoPermissoes[permissao.id]}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                {permissao.bloqueado && (
                                  <p className="text-xs text-muted-foreground">
                                    Bloqueado nesta versão.
                                  </p>
                                )}
                              </div>
                              <Switch
                                checked={permissoes[permissao.id]}
                                onCheckedChange={(valor) =>
                                  handleTogglePermissao(permissao.id, valor)
                                }
                                disabled={permissao.bloqueado}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {index < permissoesPorGrupo.length - 1 && <Separator />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        );
      case "followup":
        return (
          <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Follow-ups automáticos</p>
                {providerBaileys ? (
                  <p className="text-xs text-muted-foreground">
                    Follow-up liberado para API não oficial, sem janela de 24h.
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Cada mensagem enviada fora da janela de 24h pode gerar custo na Meta.
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href="https://developers.facebook.com/docs/whatsapp/pricing"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-muted-foreground hover:text-foreground"
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                        Confira os custos de templates e mensagens fora da janela.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleAdicionarFollowup}>
                Adicionar follow-up
              </Button>
            </div>
            {erroTemplates && (
              <p className="text-xs text-destructive">{erroTemplates}</p>
            )}
            {followups.length === 0 && (
              <div className="rounded-[6px] border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                Nenhum follow-up configurado.
              </div>
            )}
            <div className="space-y-3">
              {followups.map((followup) => (
                <Card key={followup.id} className="border-border/60">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        value={followup.nome}
                        onChange={(event) =>
                          handleAtualizarFollowup(followup.id, {
                            nome: event.target.value,
                          })
                        }
                        placeholder="Nome do follow-up"
                        className="flex-1 min-w-[220px]"
                      />
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground">
                              Ativo
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                            Ativa ou desativa este follow-up sem excluir.
                          </TooltipContent>
                        </Tooltip>
                        <Switch
                          checked={followup.ativo}
                          onCheckedChange={(valor) =>
                            handleAtualizarFollowup(followup.id, { ativo: valor })
                          }
                        />
                      </div>
                    </div>
                    <Separator />
                    {!providerBaileys && (
                      <>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <label className="flex items-center gap-2">
                            <Switch
                              checked={followup.somenteForaJanela ?? false}
                              onCheckedChange={(valor) =>
                                handleAtualizarFollowup(followup.id, {
                                  somenteForaJanela: valor,
                                })
                              }
                            />
                            Somente fora da janela 24h
                          </label>
                        </div>
                        <Separator />
                      </>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-xs font-medium">Delay (minutos)</label>
                        <Input
                          type="number"
                          min={1}
                          value={followup.delayMinutos}
                          onChange={(event) =>
                            handleAtualizarFollowup(followup.id, {
                              delayMinutos: Number(event.target.value || 0),
                            })
                          }
                        />
                      </div>
                      {providerBaileys ? (
                        <div className="grid gap-2">
                          <label className="text-xs font-medium">
                            Mensagem do follow-up
                          </label>
                          <Textarea
                            value={followup.mensagemTexto ?? ""}
                            onChange={(event) =>
                              handleAtualizarFollowup(followup.id, {
                                mensagemTexto: event.target.value,
                                usarTemplate: false,
                              })
                            }
                            rows={4}
                            placeholder="Digite a mensagem que sera enviada."
                          />
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-medium">
                              Template WhatsApp
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={handleSincronizarTemplates}
                              disabled={templateSyncDisabled}
                            >
                              {templateSyncLabel}
                            </Button>
                          </div>
                          <Select
                            value={followup.templateId ?? ""}
                            onValueChange={(valor) =>
                              handleAtualizarFollowup(followup.id, {
                                templateId: valor || undefined,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o template" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                              {templatesWhatsapp.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.nome} • {template.idioma}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            aria-label="Excluir follow-up"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                          <DialogHeader>
                            <DialogTitle>Excluir follow-up?</DialogTitle>
                            <DialogDescription>
                              Esta ação é permanente e não pode ser desfeita.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="secondary">Cancelar</Button>
                            </DialogClose>
                            <Button
                              variant="destructive"
                              onClick={() => handleRemoverFollowup(followup.id)}
                            >
                              Excluir
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "revisao":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[6px] border border-border/60 bg-background/70 p-4 text-sm">
                <p className="font-medium">Identidade</p>
                <p className="text-xs text-muted-foreground">
                  {formAgente.nome || "Nome não definido"} •{" "}
                  {tiposAgente.find((item) => item.value === formAgente.tipo)?.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tom:{" "}
                  {formAgente.tom === "outro" && tomPersonalizado
                    ? `Outro (${tomPersonalizado})`
                    : tonsAgente.find((item) => item.value === formAgente.tom)?.label}
                </p>
              </div>
              <div className="rounded-[6px] border border-border/60 bg-background/70 p-4 text-sm">
                <p className="font-medium">Canais e CRM</p>
                <p className="text-xs text-muted-foreground">
                  Canal: WhatsApp
                </p>
                <p className="text-xs text-muted-foreground">
                  Conta:{" "}
                  {(() => {
                    const conta = numerosWhatsapp.find(
                      (numero) => numero.id === numeroSelecionado
                    );
                    return conta ? formatarNumeroExibicao(conta) : "Não definida";
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pipeline:{" "}
                  {pipelinesDisponiveis.find((pipe) => pipe.id === pipelineSelecionado)?.nome ??
                    "Não definido"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Etapa:{" "}
                  {etapasDisponiveis.find((etapa) => etapa.id === etapaSelecionada)?.nome ??
                    "Não definido"}
                </p>
              </div>
              <div className="rounded-[6px] border border-border/60 bg-background/70 p-4 text-sm">
                <p className="font-medium">Comportamento</p>
                <p className="text-xs text-muted-foreground">
                  Tempo de resposta: {tempoResposta}s • Timezone: {timezone}
                </p>
              </div>
              <div className="rounded-[6px] border border-border/60 bg-background/70 p-4 text-sm">
                <p className="font-medium">Conhecimento</p>
                <p className="text-xs text-muted-foreground">
                  Prompt: {promptAgente ? "Configurado" : "Não configurado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  FAQ: {faq ? "Configurado" : "Não configurado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Arquivos: {arquivosConhecimento.length} enviados
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-background/70 p-4 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Consentimento</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex text-muted-foreground">
                        <CircleHelp className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                      Autorização para o uso de IA com dados do workspace.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">
                  Confirme o uso de IA com dados do workspace.
                </p>
              </div>
              <Switch checked={consentimento} onCheckedChange={setConsentimento} />
            </div>
          </div>
        );
      case "testes":
        return renderSandboxChat();
      default:
        return null;
    }
  };

  const handleSalvarAgente = async (redirecionar = true) => {
    await persistirAgente(redirecionar);
  };

  const logsFiltrados = React.useMemo(() => {
    const agora = new Date();
    const dias =
      filtroAuditoriaPeriodo === "7d"
        ? 7
        : filtroAuditoriaPeriodo === "30d"
          ? 30
          : 90;
    const limite = new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);

    return logsAuditoria.filter((log) => {
      if (log.createdAt && new Date(log.createdAt) < limite) {
        return false;
      }
      if (
        filtroAuditoriaAcao !== "todas" &&
        !log.resumo.toLowerCase().includes(filtroAuditoriaAcao.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [filtroAuditoriaAcao, logsAuditoria]);

  const nomeInvalido = !formAgente.nome.trim();
  const consentimentoInvalido = !consentimento;
  const etapasFiltradas = pipelineSelecionado
    ? etapasDisponiveis.filter((etapa) => etapa.pipelineId === pipelineSelecionado)
    : etapasDisponiveis;
  const PROMPT_MAX_PALAVRAS = 2000;
  const PROMPT_MAX_CARACTERES = 11000;
  const FAQ_MAX_PALAVRAS = 4000;
  const FAQ_MAX_CARACTERES = 20000;
  const promptWordCount = contarPalavras(promptAgente);
  const faqWordCount = contarPalavras(faq);
  const contaSelecionada = numeroSelecionado;
  const canaisPermitidos: CanalId[] = ["whatsapp"];
  const variaveisWorkspace = [
    {
      id: "workspace",
      label: "Workspace",
      valor: workspace?.nome ?? "Nao informado",
    },
    {
      id: "plano",
      label: "Plano",
      valor: plano?.nome ?? "Nao informado",
    },
    {
      id: "timezone",
      label: "Timezone",
      valor: timezone || "Nao informado",
    },
  ];
  const checklistConfiguracao = [
    { id: "nome", label: "Nome do agente", ok: !nomeInvalido },
    {
      id: "canal",
      label: "Canal e conta",
      ok: Boolean(canalSelecionado) && Boolean(contaSelecionada),
    },
    {
      id: "pipeline",
      label: "Pipeline e etapa inicial",
      ok: Boolean(pipelineSelecionado) && Boolean(etapaSelecionada),
    },
    {
      id: "agendas",
      label: "Agendas conectadas",
      ok: agendasSelecionadas.length > 0,
    },
    { id: "consentimento", label: "Consentimento", ok: consentimento },
  ];
  const wizardSteps = [
    {
      id: "identidade",
      titulo: "Identidade",
      descricao: "Nome, função e estilo de voz.",
      obrigatorio: true,
    },
    {
      id: "canais",
      titulo: "Canais",
      descricao: "WhatsApp.",
      obrigatorio: true,
    },
    {
      id: "crm",
      titulo: "CRM",
      descricao: "Pipeline, etapa e agendas.",
      obrigatorio: true,
    },
    {
      id: "comportamento",
      titulo: "Comportamento",
      descricao: "Idioma, tempo e pausas.",
      obrigatorio: true,
    },
    {
      id: "conhecimento",
      titulo: "Conhecimento",
      descricao: "Prompt, FAQ e arquivos.",
      obrigatorio: true,
    },
    {
      id: "acoes",
      titulo: "Ações",
      descricao: "Permissões e regras.",
      obrigatorio: true,
    },
    {
      id: "followup",
      titulo: "Follow-up",
      descricao: "Agende mensagens de acompanhamento.",
      obrigatorio: false,
    },
    {
      id: "revisao",
      titulo: "Revisão",
      descricao: "Resumo e consentimento.",
      obrigatorio: true,
    },
    {
      id: "testes",
      titulo: "Testes",
      descricao: "Valide seu agente.",
      obrigatorio: false,
    },
  ] as const;
  const permissoesPorGrupo = [
    {
      titulo: "Inbox",
      ids: ["enviar_mensagem", "resolver_conversa", "marcar_spam"],
    },
    {
      titulo: "CRM",
      ids: [
        "criar_contato",
        "editar_contato",
        "criar_deal",
        "editar_deal",
        "mover_etapa",
        "aplicar_tag",
      ],
    },
    {
      titulo: "Calendário",
      ids: [
        "calendar_criar",
        "calendar_editar",
        "calendar_cancelar",
        "calendar_consultar",
      ],
    },
  ] as const;
  const permissoesMap = new Map(
    permissoesBase.map((permissao) => [permissao.id, permissao])
  );
  const descricaoPermissoes: Record<string, string> = {
    enviar_mensagem: "Envia mensagens para o contato no canal configurado.",
    resolver_conversa: "Marca a conversa como resolvida no inbox.",
    marcar_spam: "Marca a conversa como spam para interromper atendimento.",
    criar_contato: "Cria um contato no CRM quando necessario.",
    editar_contato: "Atualiza dados do contato no CRM.",
    criar_deal: "Cria um negocio na pipeline configurada.",
    editar_deal: "Atualiza dados do deal no CRM.",
    mover_etapa: "Move o negocio entre etapas da pipeline.",
    aplicar_tag: "Aplica tags em contatos ou deals.",
    calendar_criar: "Cria eventos no calendario conectado.",
    calendar_editar: "Atualiza eventos existentes no calendario.",
    calendar_cancelar: "Cancela eventos no calendario.",
    calendar_consultar: "Consulta detalhes de eventos no calendario.",
  };
  const passoAtualInfo = wizardSteps[passoAtual];
  const progressoWizard = Math.round(
    ((passoAtual + 1) / wizardSteps.length) * 100
  );
  const maxPassoDisponivel =
    usarWizard && !modoCriacao ? wizardSteps.length - 1 : maxPasso;
  const validacoesWizard: Record<(typeof wizardSteps)[number]["id"], boolean> = {
    identidade: !nomeInvalido,
    canais: Boolean(canalSelecionado) && Boolean(contaSelecionada),
    crm: Boolean(pipelineSelecionado) && Boolean(etapaSelecionada),
    comportamento: true,
    conhecimento: promptWordCount > 0,
    acoes: permissoesBase.some((permissao) => permissoes[permissao.id]),
    followup: true,
    revisao: consentimento,
    testes: true,
  };
  const podeAvancarWizard = validacoesWizard[passoAtualInfo.id];
  const passoFinal = passoAtualInfo.id === "testes";
  const exibirCabecalhoEtapa = passoAtualInfo.id !== "testes";
  const tipoAgenteLabel = tiposAgente.find(
    (item) => item.value === formAgente.tipo
  )?.label;
  const tituloPagina = modoCriacao ? "Seu novo agente de I.A" : "Editar agente";
  const providerLabel =
    providerSelecionado === "whatsapp_baileys"
      ? "WhatsApp (API não oficial)"
      : providerSelecionado === "whatsapp_oficial"
        ? "WhatsApp oficial"
        : "WhatsApp";
  const descricaoPagina = modoCriacao
    ? "Configuração guiada para criar um agente completo."
    : [formAgente.nome, tipoAgenteLabel].filter(Boolean).join(" • ") ||
      "Ajuste as configurações do agente.";

  React.useEffect(() => {
    if (providerSelecionado !== "whatsapp_oficial") {
      modalDiretrizesMetaDisparado.current = false;
      return;
    }
    const emFollowup = usarWizard
      ? passoAtualInfo.id === "followup"
      : abaAtiva === "followup";
    if (emFollowup && !modalDiretrizesMetaDisparado.current) {
      setModalDiretrizesMetaAberto(true);
      modalDiretrizesMetaDisparado.current = true;
    }
  }, [abaAtiva, passoAtualInfo.id, providerSelecionado, usarWizard]);

  if (carregando) {
    return (
      <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          {!usarWizard && <Skeleton className="h-6 w-24 rounded-[6px]" />}
        </div>
        <Card className="overflow-hidden shadow-none">
          <CardContent className="p-6">
            {usarWizard ? (
              <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-[6px]" />
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Skeleton
                        key={`wizard-step-skeleton-${index}`}
                        className="h-14 w-full rounded-[6px]"
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-4/5" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-10 w-2/3" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-10 w-40" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
      <TooltipProvider>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {usarWizard ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="gap-2 border border-border/60"
                  >
                    <Link href="/app/agentes" aria-label="Voltar para página de Agentes">
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">Voltar para página de Agentes</TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/agentes" className="inline-flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Voltar para agentes
                </Link>
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-semibold">
                {tituloPagina}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{descricaoPagina}</span>
                <Badge variant="outline">{providerLabel}</Badge>
              </div>
            </div>
          </div>
          {usarWizard ? null : (
            <Badge variant={statusBadge[formAgente.status].variant}>
              {statusBadge[formAgente.status].label}
            </Badge>
          )}
        </div>
      </TooltipProvider>

      {erro && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {erro}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={modalDiretrizesMetaAberto}
        onOpenChange={setModalDiretrizesMetaAberto}
      >
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>Diretrizes do WhatsApp Oficial</DialogTitle>
            <DialogDescription>
              Mensagens fora da janela de 24h exigem template aprovado e podem gerar
              custos adicionais. Consulte as politicas e precos oficiais antes de
              configurar follow-ups.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <a
              href="https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Ver diretrizes oficiais da Meta
            </a>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalDiretrizesMetaAberto(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={avisoProcessamentoAberto} onOpenChange={setAvisoProcessamentoAberto}>
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>Processamento de arquivos iniciado</DialogTitle>
            <DialogDescription>
              O processamento é detalhado e pode levar cerca de{" "}
              <strong>{estimativaProcessamento} minutos</strong>. Você pode
              continuar navegando enquanto o agente prepara o conhecimento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Entendi</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="overflow-hidden shadow-none">
        <CardContent className="p-0">
          {usarWizard ? (
            <div className="p-6">
              <TooltipProvider>
                <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
                    <div className="rounded-[6px] border border-border/60 bg-muted/30 p-4">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Progresso
                      </p>
                      <div className="mt-3 h-2 w-full rounded-[6px] bg-muted">
                        <div
                          className="h-2 rounded-[6px] bg-primary transition-all"
                          style={{ width: `${progressoWizard}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{progressoWizard}% concluído</span>
                        <span>
                          {passoAtual + 1}/{wizardSteps.length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {wizardSteps.map((step, index) => {
                        const ativo = index === passoAtual;
                        const completo = validacoesWizard[step.id] && index < passoAtual;
                        const habilitado = index <= maxPassoDisponivel;
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => handleIrParaPasso(index)}
                            disabled={!habilitado}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-[6px] border p-3 text-left text-sm transition",
                              ativo
                                ? "border-primary/50 bg-primary/5"
                                : "border-border/60 bg-background/70",
                              !habilitado && "cursor-not-allowed opacity-50"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-7 w-7 items-center justify-center rounded-[6px] border text-xs font-semibold",
                                ativo
                                  ? "border-primary text-primary"
                                  : "border-border text-muted-foreground"
                              )}
                            >
                              {completo ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                index + 1
                              )}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium">{step.titulo}</p>
                              {step.descricao && (
                                <p className="text-xs text-muted-foreground">
                                  {step.descricao}
                                </p>
                              )}
                            </div>
                            {!step.obrigatorio && (
                              <Badge variant="outline" className="text-[10px]">
                                Opcional
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground md:hidden">
                      <span>
                        Etapa {passoAtual + 1} de {wizardSteps.length}
                      </span>
                    </div>
                    <Card className="border-border/60">
                      <CardContent className="space-y-6 p-6">
                        {exibirCabecalhoEtapa && (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">
                                {passoAtualInfo.titulo}
                              </p>
                              {passoAtualInfo.descricao && (
                                <p className="text-xs text-muted-foreground">
                                  {passoAtualInfo.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {renderWizardConteudo()}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TooltipProvider>
            </div>
          ) : (
            <div className="p-4">
              <TooltipProvider>
                <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
                <TabsList className="grid w-full grid-cols-3 gap-2 md:grid-cols-6">
                  <TabsTrigger value="configuracao">Configuração</TabsTrigger>
                  <TabsTrigger value="acoes">Ações</TabsTrigger>
                  <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
                  <TabsTrigger value="followup">Follow-up</TabsTrigger>
                  <TabsTrigger value="testar">Testar</TabsTrigger>
                  <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
                </TabsList>

                <TabsContent value="configuracao" className="pt-4">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-6">
                      <Card className="border-border/60">
                        <CardContent className="space-y-4 p-4">
                          <div>
                            <p className="text-sm font-semibold">Identidade do agente</p>
                            <p className="text-xs text-muted-foreground">
                              Defina nome, função e estilo de conversa.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Função principal</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {templatesAgente.map((template) => {
                                const Icone = template.icone;
                                const ativo = formAgente.tipo === template.id;
                                return (
                                  <button
                                    key={template.id}
                                    type="button"
                                    onClick={() =>
                                      setFormAgente((atual) => ({
                                        ...atual,
                                        tipo: template.id as TipoAgente,
                                      }))
                                    }
                                    className={cn(
                                      "flex w-full items-start gap-3 rounded-[6px] border border-border/60 bg-background/80 p-3 text-left text-sm transition",
                                      ativo && "border-primary/50 bg-primary/5"
                                    )}
                                  >
                                    <span className="mt-1 rounded-[6px] bg-primary/10 p-2 text-primary">
                                      <Icone className="h-4 w-4" />
                                    </span>
                                    <div>
                                      <p className="font-medium">{template.nome}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {template.descricao}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <Separator />
                          <div className="grid gap-3">
                            <div className="grid gap-2">
                              <label htmlFor="agente-nome" className="text-sm font-medium">
                                Nome do agente
                              </label>
                              <Input
                                id="agente-nome"
                                value={formAgente.nome}
                                onChange={(event) =>
                                  setFormAgente((atual) => ({
                                    ...atual,
                                    nome: event.target.value,
                                  }))
                                }
                                placeholder="Ex: Maya SDR"
                              />
                              <p className="text-xs text-muted-foreground">
                                Este nome sera usado pelo agente ao se apresentar nas conversas.
                              </p>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="grid gap-2">
                                <label className="text-sm font-medium">Tom de voz</label>
                                <Select
                                  value={formAgente.tom}
                                  onValueChange={(valor) =>
                                    setFormAgente((atual) => ({
                                      ...atual,
                                      tom: valor as TomAgente,
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tom" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    {tonsAgente.map((tom) => (
                                      <SelectItem key={tom.value} value={tom.value}>
                                        {tom.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <label className="text-sm font-medium">
                                  Horário de atuação
                                </label>
                                <Select
                                  value={formAgente.horario}
                                  onValueChange={(valor) =>
                                    setFormAgente((atual) => ({
                                      ...atual,
                                      horario: valor as AgenteIA["horario"],
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o horário" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    {horariosAgente.map((horario) => (
                                      <SelectItem key={horario.value} value={horario.value}>
                                        {horario.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            {formAgente.tom === "outro" && (
                              <div className="grid gap-2">
                                <label className="text-sm font-medium">
                                  Tom de voz personalizado
                                </label>
                                <Input
                                  value={tomPersonalizado}
                                  onChange={(event) => setTomPersonalizado(event.target.value)}
                                  placeholder="Descreva o tom de voz desejado."
                                />
                              </div>
                            )}
                            {formAgente.horario === "personalizado" && (
                              <div className="grid gap-2">
                                <label className="text-sm font-medium">
                                  Horário personalizado
                                </label>
                                <Input
                                  value={horarioPersonalizado}
                                  onChange={(event) =>
                                    setHorarioPersonalizado(event.target.value)
                                  }
                                  placeholder="Ex: 08h às 20h"
                                />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/60">
                        <CardContent className="space-y-4 p-4">
                          <div>
                            <p className="text-sm font-semibold">Canais e CRM</p>
                            <p className="text-xs text-muted-foreground">
                              Defina canal, conta, pipeline e agendas do agente.
                            </p>
                          </div>
                          <div className="space-y-4">
                            <div className="grid gap-2">
                              <label className="text-sm font-medium">Canal ativo</label>
                              <Select
                                value={canalSelecionado}
                                onValueChange={(valor) =>
                                  handleSelecionarCanal(valor as CanalId)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o canal" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                  {canaisPermitidos.map((canal) => (
                                    <SelectItem key={canal} value={canal}>
                                      {nomeCanal(canal)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Separator />
                            <div className="grid gap-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <span>Número WhatsApp do agente</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex text-muted-foreground">
                                      <CircleHelp className="h-4 w-4" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    Escolha o número conectado para esse agente.
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              {numerosWhatsapp.length ? (
                                <Select
                                  value={numeroSelecionado ?? ""}
                                  onValueChange={(valor) =>
                                    setNumeroSelecionado(valor || null)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um número" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    {numerosWhatsapp.map((numero) => (
                                      <SelectItem
                                        key={numero.id}
                                        value={numero.id}
                                        disabled={numero.emUso}
                                      >
                                        {formatarNumeroExibicao(numero)}
                                        {numero.emUso ? " (em uso)" : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Nenhum número conectado.
                                </p>
                              )}
                            </div>
                            <Separator />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="grid gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <span>Pipeline principal</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex text-muted-foreground">
                                        <CircleHelp className="h-4 w-4" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                      Pipeline onde o agente cria e move negócios.
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <Select
                                  value={pipelineSelecionado ?? ""}
                                  onValueChange={(valor) =>
                                    setPipelineSelecionado(valor || null)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o pipeline" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    {pipelinesDisponiveis.map((pipeline) => (
                                      <SelectItem key={pipeline.id} value={pipeline.id}>
                                        {pipeline.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <span>Etapa inicial</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex text-muted-foreground">
                                        <CircleHelp className="h-4 w-4" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                      Etapa onde novos leads entram automaticamente.
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <Select
                                  value={etapaSelecionada ?? ""}
                                  onValueChange={(valor) =>
                                    setEtapaSelecionada(valor || null)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione a etapa" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    {etapasFiltradas.map((etapa) => (
                                      <SelectItem key={etapa.id} value={etapa.id}>
                                        {etapa.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Separator />
                            <div className="grid gap-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <span>Agendas disponíveis</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex text-muted-foreground">
                                      <CircleHelp className="h-4 w-4" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    Selecione as agendas que o agente pode usar.
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              {agendasDisponiveis.length ? (
                                <div className="space-y-3">
                                  <Select
                                    value={agendaEmSelecao}
                                    onValueChange={(valor) => {
                                      handleAdicionarAgenda(valor);
                                      setAgendaEmSelecao("");
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma agenda" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                      {agendasDisponiveis.map((agenda) => (
                                        <SelectItem key={agenda.id} value={agenda.id}>
                                          {agenda.titulo}
                                          {agenda.primaria &&
                                            " • Agenda principal (voce)"}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex flex-wrap gap-2">
                                    {agendasSelecionadas.map((agendaId) => {
                                      const agenda = agendasDisponiveis.find(
                                        (item) => item.id === agendaId
                                      );
                                      if (!agenda) return null;
                                      return (
                                        <Badge
                                          key={agendaId}
                                          variant="secondary"
                                          className="flex items-center gap-1"
                                        >
                                          {agenda.titulo}
                                          {agenda.primaria && " (voce)"}
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4"
                                            onClick={() =>
                                              handleRemoverAgenda(agendaId)
                                            }
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </Badge>
                                      );
                                    })}
                                    {agendasSelecionadas.length === 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        Nenhuma agenda selecionada.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                                  <span>Nenhuma agenda configurada.</span>
                                  <Button asChild variant="outline" size="sm">
                                    <Link href="/app/calendario">
                                      Configurar agendas
                                    </Link>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/60">
                        <CardContent className="space-y-4 p-4">
                          <div>
                            <p className="text-sm font-semibold">Idioma e tempo</p>
                            <p className="text-xs text-muted-foreground">
                              Controle o tempo de resposta e a localização do agente.
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid gap-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <span>Tempo de resposta (segundos)</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex text-muted-foreground">
                                      <CircleHelp className="h-4 w-4" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    Define o tempo alvo para responder aos leads.
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                type="number"
                                min={5}
                                value={tempoResposta}
                                onChange={(event) =>
                                  setTempoResposta(Number(event.target.value || 0))
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <span>Timezone</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex text-muted-foreground">
                                      <CircleHelp className="h-4 w-4" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    Usado para horários de atuação e follow-ups.
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                value={timezone}
                                onChange={(event) => setTimezone(event.target.value)}
                                placeholder="America/Sao_Paulo"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/60">
                        <CardContent className="space-y-4 p-4">
                          <div>
                            <p className="text-sm font-semibold">Pausa automática</p>
                            <p className="text-xs text-muted-foreground">
                              Defina quando o agente deve interromper o atendimento.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <span>Pausar por tags</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex text-muted-foreground">
                                    <CircleHelp className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                  Tags aplicadas no lead ou contato pausam o agente.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          {tagsDisponiveis.length ? (
                            <div className="space-y-3">
                              <Select
                                value={tagEmSelecao}
                                onValueChange={(valor) => {
                                  handleAdicionarTagPausa(valor);
                                  setTagEmSelecao("");
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma tag" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                  {tagsDisponiveis.map((tag) => (
                                    <SelectItem key={tag.id} value={tag.id}>
                                      {tag.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex flex-wrap gap-2">
                                {pausarTags.map((tagId) => {
                                  const tag = tagsDisponiveis.find(
                                    (item) => item.id === tagId
                                  );
                                  if (!tag) return null;
                                  return (
                                    <Badge
                                      key={tagId}
                                      variant="secondary"
                                      className="flex items-center gap-1"
                                    >
                                      {tag.nome}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4"
                                        onClick={() => handleRemoverTagPausa(tagId)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </Badge>
                                  );
                                })}
                                {pausarTags.length === 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    Nenhuma tag selecionada.
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Nenhuma tag disponível.
                            </span>
                          )}
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <span>Pausar por etapas</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex text-muted-foreground">
                                    <CircleHelp className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                  Etapas específicas interrompem o agente automaticamente.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            {etapasFiltradas.length ? (
                              <div className="space-y-3">
                                <Select
                                  value={etapaEmSelecao}
                                  onValueChange={(valor) => {
                                    handleAdicionarEtapaPausa(valor);
                                    setEtapaEmSelecao("");
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma etapa" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    {etapasFiltradas.map((etapa) => (
                                      <SelectItem key={etapa.id} value={etapa.id}>
                                        {etapa.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex flex-wrap gap-2">
                                  {pausarEtapas.map((etapaId) => {
                                    const etapa = etapasFiltradas.find(
                                      (item) => item.id === etapaId
                                    );
                                    if (!etapa) return null;
                                    return (
                                      <Badge
                                        key={etapaId}
                                        variant="secondary"
                                        className="flex items-center gap-1"
                                      >
                                        {etapa.nome}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4"
                                          onClick={() =>
                                            handleRemoverEtapaPausa(etapaId)
                                          }
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </Badge>
                                    );
                                  })}
                                  {pausarEtapas.length === 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      Nenhuma etapa selecionada.
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Nenhuma etapa disponível.
                              </span>
                            )}
                          </div>
                          <div className="rounded-[6px] border border-border/60 bg-muted/30 p-3 text-sm">
                            <p className="font-medium">Escalonamento para humano</p>
                            <p className="text-xs text-muted-foreground">
                              Regras de pausa são configuradas acima por tags e etapas.
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/60">
                        <CardContent className="flex items-center justify-between gap-4 p-4 text-sm">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">Consentimento</p>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex text-muted-foreground">
                                    <CircleHelp className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                  Autorização para o uso de IA com dados do workspace.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Confirme o uso de IA com dados do workspace.
                            </p>
                          </div>
                          <Switch
                            checked={consentimento}
                            onCheckedChange={setConsentimento}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <Card className="border-border/60">
                        <CardContent className="space-y-3 p-4 text-sm">
                          <div>
                            <p className="font-semibold">Checklist de publicação</p>
                            <p className="text-xs text-muted-foreground">
                              Complete o básico para liberar o agente.
                            </p>
                          </div>
                          <div className="space-y-2">
                            {checklistConfiguracao.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-[6px] border border-border/60 bg-background/70 px-3 py-2 text-xs"
                              >
                                <span>{item.label}</span>
                                {item.ok ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    OK
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Pendente</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/60">
                        <CardContent className="space-y-3 p-4 text-sm">
                          <div>
                            <p className="font-semibold">Variáveis do workspace</p>
                            <p className="text-xs text-muted-foreground">
                              Dados usados como contexto pelo agente.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {variaveisWorkspace.map((item) => (
                              <Badge key={item.id} variant="secondary">
                                {item.label}: {item.valor}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

              <TabsContent value="acoes" className="pt-4">
                <div className="space-y-4">
                  <Card className="border-border/60">
                    <CardContent className="flex items-center justify-between gap-4 p-4 text-sm">
                      <div>
                        <p className="font-medium">Pausar quando humano responde</p>
                        <p className="text-xs text-muted-foreground">
                          Interrompe o agente quando alguém da equipe responde.
                        </p>
                      </div>
                      <Switch checked={pausarHumano} onCheckedChange={setPausarHumano} />
                    </CardContent>
                  </Card>
                  <Card className="border-border/60">
                    <CardContent className="space-y-3 p-4 text-sm">
                      <div>
                        <p className="font-medium">Permissões do agente</p>
                        <p className="text-xs text-muted-foreground">
                          Controle exatamente o que o agente pode executar.
                        </p>
                      </div>
                      <div className="space-y-4">
                        {permissoesPorGrupo.map((grupo, index) => (
                          <React.Fragment key={grupo.titulo}>
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">
                                {grupo.titulo}
                              </p>
                              <div className="space-y-2">
                                {grupo.ids.map((id) => {
                                  const permissao = permissoesMap.get(id);
                                  if (!permissao) return null;
                                  return (
                                    <div
                                      key={permissao.id}
                                        className="flex items-center justify-between rounded-[6px] border border-border/60 bg-background/70 p-3 text-sm"
                                      >
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="font-medium">{permissao.label}</p>
                                            {descricaoPermissoes[permissao.id] && (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <span className="inline-flex text-muted-foreground">
                                                    <CircleHelp className="h-3.5 w-3.5" />
                                                  </span>
                                                </TooltipTrigger>
                                                <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                                  {descricaoPermissoes[permissao.id]}
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                          {permissao.bloqueado && (
                                            <p className="text-xs text-muted-foreground">
                                              Bloqueado nesta versão.
                                            </p>
                                          )}
                                      </div>
                                      <Switch
                                        checked={permissoes[permissao.id]}
                                        onCheckedChange={(valor) =>
                                          handleTogglePermissao(permissao.id, valor)
                                        }
                                        disabled={permissao.bloqueado}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            {index < permissoesPorGrupo.length - 1 && <Separator />}
                          </React.Fragment>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="conhecimento" className="pt-4">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                    <Card className="border-border/60">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <span>Prompt do agente</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex text-muted-foreground">
                                  <CircleHelp className="h-4 w-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                Instruções base e limites de atuação do agente.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon" aria-label="Expandir prompt">
                                <Maximize2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                              <DialogHeader>
                                <DialogTitle>Prompt do agente</DialogTitle>
                                <DialogDescription>
                                  Até {PROMPT_MAX_PALAVRAS} palavras.
                                </DialogDescription>
                              </DialogHeader>
                              <Textarea
                                value={promptAgente}
                                onChange={(event) =>
                                  setPromptAgente(
                                    limitarTexto(
                                      event.target.value,
                                      PROMPT_MAX_PALAVRAS,
                                      PROMPT_MAX_CARACTERES
                                    )
                                  )
                                }
                                placeholder="Descreva regras, tom e prioridades do agente."
                                rows={12}
                                maxLength={PROMPT_MAX_CARACTERES}
                                className="h-[60vh] min-h-[320px] resize-none overflow-y-auto [field-sizing:fixed]"
                              />
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {promptWordCount} / {PROMPT_MAX_PALAVRAS} palavras
                                </span>
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="secondary">Concluir</Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div className="rounded-[6px] border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                          {promptAgente
                            ? `${promptAgente.slice(0, 240)}${promptAgente.length > 240 ? "…" : ""}`
                            : "Nenhum prompt configurado ainda."}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {promptWordCount} / {PROMPT_MAX_PALAVRAS} palavras
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/60">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span>FAQ / Manual</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex text-muted-foreground">
                                <CircleHelp className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                              Respostas rápidas, políticas e scripts internos.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Textarea
                          value={faq}
                          onChange={(event) =>
                            setFaq(
                              limitarTexto(
                                event.target.value,
                                FAQ_MAX_PALAVRAS,
                                FAQ_MAX_CARACTERES
                              )
                            )
                          }
                          placeholder="Adicione instruções, respostas e políticas internas."
                          rows={6}
                          maxLength={FAQ_MAX_CARACTERES}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{faqWordCount} / {FAQ_MAX_PALAVRAS} palavras</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-border/60">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">Arquivos de conhecimento</p>
                          <p className="text-xs text-muted-foreground">
                            Limite de 10 arquivos por agente.
                          </p>
                        </div>
                        <Badge variant="outline">
                          {arquivosConhecimento.length}/10
                        </Badge>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 rounded-[6px] border border-dashed border-border/60 bg-muted/30 p-3 text-sm">
                        <UploadCloud className="h-4 w-4" />
                        Enviar arquivos
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept=".pdf,.txt,.docx,.png,.jpg,.jpeg"
                          onChange={handleUploadConhecimento}
                        />
                      </label>
                      <div className="space-y-2">
                        {arquivosConhecimento.map((arquivo) => (
                          <div
                            key={arquivo.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border/60 bg-background/70 p-3 text-sm"
                          >
                            <div>
                              <p className="font-medium">{arquivo.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {arquivo.tipo.toUpperCase()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  arquivo.status === "pronto"
                                    ? "secondary"
                                    : arquivo.status === "erro"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {arquivo.status === "pronto"
                                  ? "Pronto"
                                  : arquivo.status === "erro"
                                    ? "Erro"
                                    : arquivo.status === "pendente"
                                      ? "Pendente"
                                      : "Processando"}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoverArquivo(arquivo.id)}
                              >
                                Remover
                              </Button>
                            </div>
                          </div>
                        ))}
                        {!arquivosConhecimento.length && (
                          <div className="rounded-[6px] border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                            Nenhum arquivo enviado ainda.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="followup" className="pt-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Follow-ups automáticos</p>
                      {providerBaileys ? (
                        <p className="text-xs text-muted-foreground">
                          Follow-up liberado para API não oficial, sem janela de 24h.
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            Cada mensagem enviada fora da janela de 24h pode gerar custo na Meta.
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href="https://developers.facebook.com/docs/whatsapp/pricing"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center text-muted-foreground hover:text-foreground"
                              >
                                <CircleHelp className="h-3.5 w-3.5" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                              Confira os custos de templates e mensagens fora da janela.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAdicionarFollowup}>
                      Adicionar follow-up
                    </Button>
                  </div>
                  {erroTemplates && (
                    <p className="text-xs text-destructive">{erroTemplates}</p>
                  )}
                  {followups.length === 0 && (
                    <div className="rounded-[6px] border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                      Nenhum follow-up configurado.
                    </div>
                  )}
                  <div className="space-y-3">
                    {followups.map((followup) => (
                      <Card key={followup.id} className="border-border/60">
                        <CardContent className="space-y-4 p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <Input
                              value={followup.nome}
                              onChange={(event) =>
                                handleAtualizarFollowup(followup.id, {
                                  nome: event.target.value,
                                })
                              }
                              placeholder="Nome do follow-up"
                              className="flex-1 min-w-[220px]"
                            />
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground">
                                    Ativo
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                  Ativa ou desativa este follow-up sem excluir.
                                </TooltipContent>
                              </Tooltip>
                              <Switch
                                checked={followup.ativo}
                                onCheckedChange={(valor) =>
                                  handleAtualizarFollowup(followup.id, { ativo: valor })
                                }
                              />
                            </div>
                          </div>
                          <Separator />
                          {!providerBaileys && (
                            <>
                              <div className="flex flex-wrap items-center gap-3 text-xs">
                                <label className="flex items-center gap-2">
                                  <Switch
                                    checked={followup.somenteForaJanela ?? false}
                                    onCheckedChange={(valor) =>
                                      handleAtualizarFollowup(followup.id, {
                                        somenteForaJanela: valor,
                                      })
                                    }
                                  />
                                  Somente fora da janela 24h
                                </label>
                              </div>
                              <Separator />
                            </>
                          )}
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="grid gap-2">
                              <label className="text-xs font-medium">
                                Delay (minutos)
                              </label>
                              <Input
                                type="number"
                                min={1}
                                value={followup.delayMinutos}
                                onChange={(event) =>
                                  handleAtualizarFollowup(followup.id, {
                                    delayMinutos: Number(event.target.value || 0),
                                  })
                                }
                              />
                            </div>
                            {providerBaileys ? (
                              <div className="grid gap-2">
                                <label className="text-xs font-medium">
                                  Mensagem do follow-up
                                </label>
                                <Textarea
                                  value={followup.mensagemTexto ?? ""}
                                  onChange={(event) =>
                                    handleAtualizarFollowup(followup.id, {
                                      mensagemTexto: event.target.value,
                                      usarTemplate: false,
                                    })
                                  }
                                  rows={4}
                                  placeholder="Digite a mensagem que sera enviada."
                                />
                              </div>
                            ) : (
                              <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-xs font-medium">
                                    Template WhatsApp
                                  </label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={handleSincronizarTemplates}
                                    disabled={templateSyncDisabled}
                                  >
                                    {templateSyncLabel}
                                  </Button>
                                </div>
                                <Select
                                  value={followup.templateId ?? ""}
                                  onValueChange={(valor) =>
                                    handleAtualizarFollowup(followup.id, {
                                      templateId: valor || undefined,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o template" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                    {templatesWhatsapp.map((template) => (
                                      <SelectItem key={template.id} value={template.id}>
                                        {template.nome} • {template.idioma}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                          <Separator />
                          <div className="flex items-center justify-end">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  aria-label="Excluir follow-up"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                                <DialogHeader>
                                  <DialogTitle>Excluir follow-up?</DialogTitle>
                                  <DialogDescription>
                                    Esta ação é permanente e não pode ser desfeita.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <Button variant="secondary">Cancelar</Button>
                                  </DialogClose>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleRemoverFollowup(followup.id)}
                                  >
                                    Excluir
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="testar" className="pt-4">
                {renderSandboxChat()}
              </TabsContent>

              <TabsContent value="auditoria" className="pt-4">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      value={filtroAuditoriaPeriodo}
                      onValueChange={setFiltroAuditoriaPeriodo}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Período" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                        <SelectItem value="7d">Últimos 7 dias</SelectItem>
                        <SelectItem value="30d">Últimos 30 dias</SelectItem>
                        <SelectItem value="90d">Últimos 90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={filtroAuditoriaAcao}
                      onChange={(event) => setFiltroAuditoriaAcao(event.target.value)}
                      placeholder="Filtrar ação"
                    />
                  </div>
                  <div className="space-y-3">
                    {logsFiltrados.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-[6px] border border-border/60 bg-background/70 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{log.resumo}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.data}
                            </p>
                          </div>
                          <Badge variant="outline">OK</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Registro de auditoria do agente.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TooltipProvider>
          </div>
          )}

          <Separator />
          {usarWizard ? (
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Passo {passoAtual + 1} de {wizardSteps.length}
                  </Badge>
                  {podeAvancarWizard
                    ? "Tudo certo para avançar."
                    : "Complete os campos obrigatórios para continuar."}
                </div>
                {!modoCriacao && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formAgente.status === "ativo"}
                      onCheckedChange={(valor) =>
                        setFormAgente((atual) => ({
                          ...atual,
                          status: valor ? "ativo" : "pausado",
                        }))
                      }
                    />
                    <span>{formAgente.status === "ativo" ? "Ativo" : "Pausado"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleVoltarWizard}
                  disabled={passoAtual === 0}
                >
                  Voltar
                </Button>
                {passoFinal ? (
                  <Button
                    onClick={() => handleSalvarAgente(false)}
                    disabled={
                      !validacoesWizard.identidade ||
                      !validacoesWizard.canais ||
                      !validacoesWizard.crm ||
                      !validacoesWizard.conhecimento ||
                      !validacoesWizard.acoes ||
                      consentimentoInvalido ||
                      salvando
                    }
                  >
                    {salvando
                      ? "Salvando..."
                      : agenteIdAtual
                        ? "Salvar agente"
                        : "Salvar e habilitar testes"}
                  </Button>
                ) : (
                  <Button onClick={handleAvancarWizard} disabled={!podeAvancarWizard}>
                    Continuar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {formAgente.status === "ativo" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <PauseCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  Status do agente
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formAgente.status === "ativo"}
                    onCheckedChange={(valor) =>
                      setFormAgente((atual) => ({
                        ...atual,
                        status: valor ? "ativo" : "pausado",
                      }))
                    }
                  />
                  <span>{formAgente.status === "ativo" ? "Ativo" : "Pausado"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/app/agentes")}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSalvarAgente}
                  disabled={nomeInvalido || consentimentoInvalido || salvando}
                >
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
