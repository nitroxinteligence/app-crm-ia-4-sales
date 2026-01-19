"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowDown,
  ArrowUp,

  ArrowRightLeft,
  CalendarDays,
  Check,
  ChevronsUpDown,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  MessageSquare,
  History,
  XCircle,
  GripVertical,
  Package,
  Paperclip,
  PencilLine,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { CanalId, DealFunil, EtapaFunil } from "@/lib/types";
import { formatarMoeda } from "@/lib/formatadores";
import { podeVerDadosSensiveis } from "@/lib/permissoes";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/lib/supabase/client";
import { buildR2PublicUrl } from "@/lib/r2/public";
import { deleteR2Object, uploadFileToR2 } from "@/lib/r2/browser";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const LIMITE_INICIAL = 8;
const CORES_TAGS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#0ea5e9",
  "#db2777",
  "#14b8a6",
  "#e11d48",
];

const apenasNumeros = (valor: string) => valor.replace(/\D/g, "");

const slug = (valor: string) =>
  valor
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const formatarDataCurta = (valor?: string) => {
  if (!valor) return "Data não informada";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Data inválida";
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const formatarDataHora = (valor?: string) => {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatarBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "0 B";
  const unidades = ["B", "KB", "MB", "GB"];
  const indice = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    unidades.length - 1
  );
  const valor = bytes / Math.pow(1024, indice);
  return `${valor.toFixed(valor < 10 && indice > 0 ? 1 : 0)} ${unidades[indice]}`;
};

const formatarTelefone = (valor?: string) => {
  if (!valor) return "";
  let numeros = apenasNumeros(valor);
  if (numeros.length > 11 && numeros.startsWith("55")) {
    numeros = numeros.slice(2);
  }
  numeros = numeros.slice(0, 11);
  if (numeros.length === 0) return "";
  if (numeros.length < 3) return `(${numeros}`;
  const ddd = numeros.slice(0, 2);
  const resto = numeros.slice(2);
  if (resto.length === 0) return `(${ddd})`;
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  if (resto.length <= 8) {
    return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  }
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5, 9)}`;
};

const gerarCorTag = () => {
  const indice = Math.floor(Math.random() * CORES_TAGS.length);
  return CORES_TAGS[indice];
};

const normalizarTexto = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const classeTextoEtapa = (cor?: string) => {
  if (!cor) {
    return "text-foreground";
  }
  const hex = cor.replace("#", "").trim();
  if (hex.length !== 3 && hex.length !== 6) {
    return "text-foreground";
  }
  const normalizado =
    hex.length === 3
      ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
      : hex;
  const r = Number.parseInt(normalizado.slice(0, 2), 16);
  const g = Number.parseInt(normalizado.slice(2, 4), 16);
  const b = Number.parseInt(normalizado.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return "text-foreground";
  }
  const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminancia > 186 ? "text-slate-900" : "text-white";
};

type FunilConfig = {
  id: string;
  nome: string;
  descricao?: string;
  etapas?: EtapaFunil[];
};

type TagDisponivel = {
  id: string;
  nome: string;
  cor?: string | null;
};

type NotaContato = {
  id: string;
  conteudo: string;
  created_at: string;
  autor_id?: string | null;
};

type ArquivoContato = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type?: string | null;
  tamanho_bytes?: number | null;
  created_at: string;
  publicUrl?: string | null;
};

type LogAuditoriaContato = {
  id: string;
  acao: string;
  detalhes?: Record<string, unknown> | null;
  created_at: string;
  autor_id?: string | null;
};

type ContatoSimplificado = {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
};

export function VisaoFunil() {
  const { usuario, session } = useAutenticacao();
  const router = useRouter();
  const podeVerValores = podeVerDadosSensiveis(usuario.role);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [carregandoDeals, setCarregandoDeals] = React.useState(false);
  const [erroDados, setErroDados] = React.useState<string | null>(null);
  const [pipelineAtivoId, setPipelineAtivoId] = React.useState<string>("");

  const obterToken = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const [deals, setDeals] = React.useState<DealFunil[]>([]);
  const [tagsDisponiveis, setTagsDisponiveis] = React.useState<TagDisponivel[]>([]);
  const [coresTags, setCoresTags] = React.useState<Record<string, string>>({});
  const [etapas, setEtapas] = React.useState<EtapaFunil[]>([]);
  const [funisDisponiveis, setFunisDisponiveis] =
    React.useState<FunilConfig[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = React.useState<{ id: string, nome: string }[]>([]);
  const [busca, setBusca] = React.useState("");
  const [filtroOwner, setFiltroOwner] = React.useState("todos");
  const [filtroTag, setFiltroTag] = React.useState("todas");
  const [filtroOrigem, setFiltroOrigem] = React.useState("todas");
  const [filtroStatus, setFiltroStatus] = React.useState<
    DealFunil["status"] | "todos"
  >("todos");
  const [filtroCanal, setFiltroCanal] = React.useState<CanalId | "todos">(
    "todos"
  );
  const [filtroValor, setFiltroValor] = React.useState("todos");
  const [filtroProduto, setFiltroProduto] = React.useState("todos");
  const [filtroMotivoPerda, setFiltroMotivoPerda] = React.useState("todos");
  const [filtroEtapa, setFiltroEtapa] = React.useState("todas");
  const [filtroDataCampo, setFiltroDataCampo] = React.useState("todas");
  const [filtroDataPeriodo, setFiltroDataPeriodo] = React.useState("todas");
  const [filtroSomenteComEmpresa, setFiltroSomenteComEmpresa] =
    React.useState(false);
  const [filtroSomenteComTags, setFiltroSomenteComTags] = React.useState(false);
  const [modoSelecao, setModoSelecao] = React.useState(false);
  const [selecionados, setSelecionados] = React.useState<string[]>([]);
  const [dealAtivo, setDealAtivo] = React.useState<DealFunil | null>(null);
  const [dialogExcluirAberto, setDialogExcluirAberto] = React.useState(false);
  const [dialogEtapasAberto, setDialogEtapasAberto] = React.useState(false);
  const [dialogEditarDealAberto, setDialogEditarDealAberto] =
    React.useState(false);
  const [dialogNotaAberto, setDialogNotaAberto] = React.useState(false);
  const [dialogAtividadeAberto, setDialogAtividadeAberto] =
    React.useState(false);
  const [dialogMoverDealAberto, setDialogMoverDealAberto] = React.useState(false);
  const [dialogExcluirArquivoAberto, setDialogExcluirArquivoAberto] = React.useState(false);
  const [arquivoExcluindo, setArquivoExcluindo] = React.useState<ArquivoContato | null>(null);

  const [dialogCriarNegocioAberto, setDialogCriarNegocioAberto] = React.useState(false);
  const [contatosDisponiveis, setContatosDisponiveis] = React.useState<ContatoSimplificado[]>([]);
  const [comboboxContatoAberto, setComboboxContatoAberto] = React.useState(false);
  const [buscaContato, setBuscaContato] = React.useState("");
  const [enviandoNovoNegocio, setEnviandoNovoNegocio] = React.useState(false);
  const [novoNegocio, setNovoNegocio] = React.useState({
    nome: "",
    valor: "",
    email: "",
    telefone: "",
    funilId: "",
    etapaId: "",
    ownerId: "",
    tags: [] as string[],
    nota: "",
    arquivos: [] as File[],
    contatoId: "",
  });
  const arquivoNovoNegocioInputRef = React.useRef<HTMLInputElement>(null);
  const [dialogExcluirDealAberto, setDialogExcluirDealAberto] =
    React.useState(false);
  const [dialogPerdaAberto, setDialogPerdaAberto] = React.useState(false);
  const [dialogGanhoAberto, setDialogGanhoAberto] = React.useState(false);
  const [dialogNovoFunilAberto, setDialogNovoFunilAberto] =
    React.useState(false);
  const [dialogMoverSelecionadosAberto, setDialogMoverSelecionadosAberto] = React.useState(false);
  const [novaEtapa, setNovaEtapa] = React.useState("");
  const [arrastandoId, setArrastandoId] = React.useState<string | null>(null);
  const [colunaEmHover, setColunaEmHover] = React.useState<string | null>(null);
  const [etapaArrastandoId, setEtapaArrastandoId] = React.useState<string | null>(
    null
  );
  const [etapaEmHover, setEtapaEmHover] = React.useState<string | null>(null);
  const [etapaParaExcluir, setEtapaParaExcluir] =
    React.useState<EtapaFunil | null>(null);
  const [dialogExcluirEtapaAberto, setDialogExcluirEtapaAberto] =
    React.useState(false);
  const [dialogExcluirPipelineAberto, setDialogExcluirPipelineAberto] =
    React.useState(false);
  const [pipelineParaExcluir, setPipelineParaExcluir] =
    React.useState<FunilConfig | null>(null);
  const [excluindoPipeline, setExcluindoPipeline] = React.useState(false);
  const [novaTagDeal, setNovaTagDeal] = React.useState("");
  const [tagRapidaId, setTagRapidaId] = React.useState<string | null>(null);
  const [tagRapidaValor, setTagRapidaValor] = React.useState("");
  const [notaAtual, setNotaAtual] = React.useState("");
  const [notasDeal, setNotasDeal] = React.useState<NotaContato[]>([]);
  const [enviandoNota, setEnviandoNota] = React.useState(false);
  const [notaEditandoId, setNotaEditandoId] = React.useState<string | null>(
    null
  );
  const [notaEditandoConteudo, setNotaEditandoConteudo] = React.useState("");
  const [notaVisualizada, setNotaVisualizada] = React.useState<{
    id: string;
    conteudo: string;
    created_at: string;
    autor_id?: string | null;
  } | null>(null);

  // Timeline Types & State
  type TimelineItem = {
    id: string;
    tipo_item: "audit" | "tarefa";
    titulo: string;
    descricao?: string;
    data: string; // created_at or due_at
    autor_nome?: string; // resolved owner/creator name
    autor_id?: string;
    metadata?: any;
    icone?: any;
  };

  const [timelineDeal, setTimelineDeal] = React.useState<TimelineItem[]>([]);
  const [carregandoTimeline, setCarregandoTimeline] = React.useState(false);





  const carregarTimeline = React.useCallback(async (dealId: string) => {
    if (!dealId || !workspaceId) return;
    setCarregandoTimeline(true);

    try {
      // 1. Fetch Audit Logs
      const { data: audits } = await supabaseClient
        .from("deal_audit")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });

      // 2. Fetch Tasks (via relations)
      const { data: relations } = await supabaseClient
        .from("task_relations")
        .select("task_id")
        .eq("relacionamento_tipo", "deal")
        .eq("relacionamento_id", dealId);

      let tasks: any[] = [];
      if (relations && relations.length > 0) {
        const taskIds = relations.map(r => r.task_id);
        const { data: tasksData } = await supabaseClient
          .from("tasks")
          .select("*")
          .in("id", taskIds)
          .order("due_at", { ascending: false });
        tasks = tasksData ?? [];
      }

      // 3. Merge & Map
      const timelineItems: TimelineItem[] = [];

      // Map Audits
      audits?.forEach(audit => {
        let titulo = "Atividade registrada";
        let descricao = "";

        switch (audit.acao) {
          case "criacao": titulo = "Negócio criado"; break;
          case "edicao": titulo = "Negócio atualizado"; descricao = "Informações editadas"; break;
          case "movimentacao":
            titulo = "Mudança de etapa";
            descricao = `${audit.detalhes?.de_etapa_nome || '...'} → ${audit.detalhes?.para_etapa_nome || '...'}`;
            break;
          case "nota_adicionada": titulo = "Nota adicionada"; break;
          case "tag_adicionada": titulo = "Tag adicionada"; descricao = audit.detalhes?.tag; break;
          case "tag_removida": titulo = "Tag removida"; descricao = audit.detalhes?.tag; break;
          case "owner_alterado": titulo = "Responsável alterado"; descricao = `Novo responsável: ${audit.detalhes?.novo_owner}`; break;
          case "ganho": titulo = "Marcado como Ganho"; break;
          case "perdido": titulo = "Marcado como Perdido"; break;
          case "arquivo_adicionado": titulo = "Arquivo anexado"; descricao = audit.detalhes?.nome_arquivo; break;
          case "arquivo_removido": titulo = "Arquivo removido"; descricao = audit.detalhes?.nome_arquivo; break;
          default: titulo = audit.acao;
        }

        timelineItems.push({
          id: audit.id,
          tipo_item: "audit",
          titulo,
          descricao,
          data: audit.created_at,
          autor_id: audit.autor_id,
          metadata: audit.detalhes
        });
      });

      // Map Tasks
      tasks?.forEach(task => {
        timelineItems.push({
          id: task.id,
          tipo_item: "tarefa",
          titulo: task.titulo,
          descricao: task.descricao || "Tarefa agendada",
          data: task.due_at || task.created_at, // Use due date if available
          autor_id: task.responsavel_id,
          metadata: { status: task.status, tipo: task.tipo }
        });
      });

      // Sort by date desc
      timelineItems.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      setTimelineDeal(timelineItems);

    } catch (err) {
      console.error("Erro ao carregar timeline:", err);
    } finally {
      setCarregandoTimeline(false);
    }
  }, [workspaceId]);

  // Helper to log activities
  const registrarAtividade = React.useCallback(async (dealId: string, acao: string, detalhes: any = {}) => {
    if (!workspaceId) return;
    console.log("Registrando atividade:", { dealId, acao, detalhes });

    const { error } = await supabaseClient.from("deal_audit").insert({
      workspace_id: workspaceId,
      deal_id: dealId,
      acao,
      detalhes,
      autor_id: session?.user.id
    });

    if (error) {
      console.error("Erro ao registrar atividade:", JSON.stringify(error, null, 2));
      console.error("Detalhes do erro:", error.message, error.code, error.details);
    } else {
      console.log("Atividade registrada com sucesso");
      // Optimistic update or refresh
      carregarTimeline(dealId);
    }
  }, [workspaceId, session?.user.id, carregarTimeline]);

  const [salvandoNotaEditada, setSalvandoNotaEditada] = React.useState(false);
  const [atividadesPorDeal, setAtividadesPorDeal] = React.useState<
    Record<
      string,
      { titulo: string; data: string; hora: string; responsavel: string }[]
    >
  >({});
  const [arquivosDeal, setArquivosDeal] = React.useState<ArquivoContato[]>([]);
  const [enviandoArquivoDeal, setEnviandoArquivoDeal] = React.useState(false);
  const [arquivoExcluindoId, setArquivoExcluindoId] = React.useState<
    string | null
  >(null);
  const [logsAuditoriaDeal, setLogsAuditoriaDeal] = React.useState<
    LogAuditoriaContato[]
  >([]);
  const [carregandoDetalhesDeal, setCarregandoDetalhesDeal] =
    React.useState(false);
  const [carregandoAuditoriaDeal, setCarregandoAuditoriaDeal] =
    React.useState(false);
  const [atividadeAtual, setAtividadeAtual] = React.useState({
    titulo: "",
    data: "",
    hora: "",
    responsavel: "",
  });
  const [formEditarDeal, setFormEditarDeal] = React.useState({
    nome: "",
    empresa: "",
    valor: "",
    moeda: "BRL",
    owner: "",
    produto: "",
  });
  const [funilDestino, setFunilDestino] = React.useState("");
  const [formNovoFunil, setFormNovoFunil] = React.useState({
    nome: "",
    descricao: "",
  });
  const [etapasNovoFunil, setEtapasNovoFunil] = React.useState<EtapaFunil[]>(
    []
  );
  const [novaEtapaNovoFunil, setNovaEtapaNovoFunil] = React.useState({
    nome: "",
    cor: "#94a3b8",
  });
  const [etapaDestino, setEtapaDestino] = React.useState("");
  const [motivoPerdaSelecionado, setMotivoPerdaSelecionado] =
    React.useState("Sem orçamento");
  const [motivoPerdaOutro, setMotivoPerdaOutro] = React.useState("");
  const [motivosPerdaConfigurados, setMotivosPerdaConfigurados] = React.useState<
    string[]
  >([]);
  const [limites, setLimites] = React.useState<Record<string, number>>(() =>
    etapas.reduce(
      (acc, etapa) => ({ ...acc, [etapa.id]: LIMITE_INICIAL }),
      {} as Record<string, number>
    )
  );
  const arquivoDealInputRef = React.useRef<HTMLInputElement | null>(null);

  const labelOwner = React.useCallback(
    (ownerId?: string | null) => {
      if (!ownerId) return "Equipe";
      if (session?.user.id === ownerId) return "Você";
      return ownerId.slice(0, 8);
    },
    [session?.user.id]
  );

  const registrarAuditoria = React.useCallback(
    async ({
      contatoId,
      acao,
      detalhes,
    }: {
      contatoId: string;
      acao: string;
      detalhes?: Record<string, unknown> | null;
    }) => {
      if (!workspaceId) return null;

      const { data, error } = await supabaseClient
        .from("contact_audit")
        .insert({
          workspace_id: workspaceId,
          contact_id: contatoId,
          autor_id: session?.user.id ?? null,
          acao,
          detalhes: detalhes ?? null,
        })
        .select("id, acao, detalhes, created_at, autor_id")
        .single();

      if (error || !data) {
        return null;
      }

      if (dealAtivo?.id === contatoId) {
        setLogsAuditoriaDeal((atual) => [data, ...atual]);
      }

      return data;
    },
    [dealAtivo?.id, session?.user.id, workspaceId]
  );

  const formatarDetalhesAuditoria = (
    detalhes?: Record<string, unknown> | null
  ) => {
    if (!detalhes) return null;
    if (typeof detalhes.mensagem === "string") {
      return detalhes.mensagem;
    }
    if (Array.isArray(detalhes.campos)) {
      return `Campos: ${detalhes.campos.join(", ")}`;
    }
    return null;
  };



  const carregarWorkspace = React.useCallback(async (sessao: Session) => {
    const { data, error } = await supabaseClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", sessao.user.id)
      .maybeSingle();

    if (error || !data?.workspace_id) {
      setWorkspaceId(null);
      setCarregando(false);
      return;
    }

    setWorkspaceId(data.workspace_id);
    carregarMembros(data.workspace_id);
  }, []);

  const [membros, setMembros] = React.useState<{ id: string; nome: string }[]>([]);

  const carregarMembros = React.useCallback(async (wsId: string) => {
    const { data, error } = await supabaseClient
      .from("workspace_members")
      .select("user_id, profiles:user_id (id, nome, full_name)")
      .eq("workspace_id", wsId);

    if (error || !data) return;

    const lista = data.map((item: any) => ({
      id: item.user_id,
      nome: item.profiles?.nome || item.profiles?.full_name || "Membro",
    }));

    setMembros(lista);
  }, []);

  const carregarTagsDisponiveis = React.useCallback(async (wsId: string) => {
    const { data, error } = await supabaseClient
      .from("tags")
      .select("id, nome, cor")
      .eq("workspace_id", wsId)
      .order("nome", { ascending: true });

    if (error || !data) {
      return;
    }

    setTagsDisponiveis(data);
    setCoresTags((atual) => {
      const atualizado = { ...atual };
      data.forEach((tag) => {
        if (tag.nome) {
          atualizado[tag.nome] = tag.cor ?? "#94a3b8";
        }
      });
      return atualizado;
    });
  }, []);

  const carregarDeals = React.useCallback(
    async (wsId: string, pipelineId: string) => {
      setCarregandoDeals(true);
      setErroDados(null);

      const { data, error } = await supabaseClient
        .from("contacts")
        .select(
          "id, nome, telefone, empresa, owner_id, value, avatar_url, pipeline_id, pipeline_stage_id, created_at, updated_at, contact_tags (tag_id, tags (id, nome, cor))"
        )
        .eq("workspace_id", wsId)
        .eq("pipeline_id", pipelineId)
        .order("updated_at", { ascending: false });

      if (error || !data) {
        setErroDados("Não foi possível carregar contatos do pipeline.");
        setCarregandoDeals(false);
        return;
      }

      const ids = data.map((item) => item.id);
      let conversas: Array<{
        contact_id: string;
        canal: CanalId;
        ultima_mensagem?: string | null;
        ultima_mensagem_em?: string | null;
      }> = [];

      if (ids.length > 0) {
        const { data: conversasData } = await supabaseClient
          .from("conversations")
          .select("contact_id, canal, ultima_mensagem, ultima_mensagem_em")
          .eq("workspace_id", wsId)
          .in("contact_id", ids);

        conversas = conversasData ?? [];
      }

      const conversaPorContato = new Map<
        string,
        {
          canal: CanalId;
          ultima_mensagem?: string | null;
          ultima_mensagem_em?: string | null;
        }
      >();

      conversas.forEach((conversa) => {
        const atual = conversaPorContato.get(conversa.contact_id);
        const atualTempo = atual?.ultima_mensagem_em
          ? new Date(atual.ultima_mensagem_em).getTime()
          : 0;
        const novoTempo = conversa.ultima_mensagem_em
          ? new Date(conversa.ultima_mensagem_em).getTime()
          : 0;
        if (!atual || novoTempo >= atualTempo) {
          conversaPorContato.set(conversa.contact_id, {
            canal: conversa.canal,
            ultima_mensagem: conversa.ultima_mensagem,
            ultima_mensagem_em: conversa.ultima_mensagem_em,
          });
        }
      });

      const cores: Record<string, string> = {};

      const mapeados: DealFunil[] = data
        .filter((item) => Boolean(item.pipeline_stage_id))
        .map((item) => {
          const tagsContato = (item.contact_tags ?? [])
            .map((tagRel) => {
              const tagItem = Array.isArray(tagRel.tags)
                ? tagRel.tags[0]
                : tagRel.tags;
              if (tagItem?.nome && tagItem.cor) {
                cores[tagItem.nome] = tagItem.cor;
              }
              return tagItem?.nome ?? null;
            })
            .filter(Boolean) as string[];
          const conversa = conversaPorContato.get(item.id);
          const dataUltima =
            item.updated_at ?? item.created_at ?? new Date().toISOString();

          return {
            id: item.id,
            nome: item.nome ?? "Contato",
            empresa: item.empresa ?? undefined,
            telefone: item.telefone ?? "",
            avatarUrl: item.avatar_url ?? undefined,
            valor: item.value ?? 0,
            moeda: "BRL",
            owner: labelOwner(item.owner_id),
            produto: "Contato",
            tags: tagsContato,
            ultimaAtividade: formatarDataCurta(dataUltima),
            ultimaMensagem: conversa?.ultima_mensagem ?? "Sem mensagens",
            canal: conversa?.canal ?? "whatsapp",
            funilId: item.pipeline_id ?? pipelineId,
            etapaId: item.pipeline_stage_id ?? "",
            origem: conversa?.canal ?? "CRM",
            status: "aberto",
            criadoEm: item.created_at ?? new Date().toISOString(),
            ultimaMudancaEtapa: dataUltima,
          };
        });

      setDeals(mapeados);
      setCoresTags(cores);
      setCarregandoDeals(false);
    },
    [labelOwner]
  );

  const carregarPipelines = React.useCallback(
    async (
      wsId: string,
      mostrarLoading = true,
      pipelinePreferido?: string
    ) => {
      if (mostrarLoading) {
        setCarregando(true);
      }
      setErroDados(null);

      const { data, error } = await supabaseClient
        .from("pipelines")
        .select("id, nome, descricao, pipeline_stages (id, nome, ordem, cor)")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: true })
        .order("ordem", { foreignTable: "pipeline_stages", ascending: true });

      if (error || !data) {
        setErroDados("Não foi possível carregar pipelines.");
        if (mostrarLoading) {
          setCarregando(false);
        }
        return;
      }

      const funis: FunilConfig[] = data.map((pipeline) => {
        const etapasPipeline = (pipeline.pipeline_stages ?? [])
          .slice()
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
          .map((etapa) => ({
            id: etapa.id,
            nome: etapa.nome,
            cor: etapa.cor ?? "#94a3b8",
          }));
        return {
          id: pipeline.id,
          nome: pipeline.nome ?? "Pipeline",
          descricao: pipeline.descricao ?? undefined,
          etapas: etapasPipeline,
        };
      });

      setFunisDisponiveis(funis);

      const pipelineAtivo =
        funis.find(
          (funil) => funil.id === (pipelinePreferido ?? pipelineAtivoId)
        ) ?? funis[0];
      const novoId = pipelineAtivo?.id ?? "";

      if (novoId && novoId !== pipelineAtivoId) {
        setPipelineAtivoId(novoId);
      }

      setEtapas(pipelineAtivo?.etapas ?? []);
      setFunilDestino(novoId);
      setEtapaDestino(pipelineAtivo?.etapas?.[0]?.id ?? "");
      setFiltroEtapa((atual) => {
        if (atual === "todas") return atual;
        const existe = pipelineAtivo?.etapas?.some((etapa) => etapa.id === atual);
        return existe ? atual : "todas";
      });
      if (mostrarLoading) {
        setCarregando(false);
      }
    },
    [pipelineAtivoId]
  );

  React.useEffect(() => {
    if (!session) {
      setWorkspaceId(null);
      setCarregando(false);
      return;
    }

    carregarWorkspace(session).catch(() => null);
  }, [carregarWorkspace, session]);

  React.useEffect(() => {
    if (!workspaceId) return;
    carregarPipelines(workspaceId).catch(() => null);
    carregarTagsDisponiveis(workspaceId).catch(() => null);
  }, [carregarPipelines, carregarTagsDisponiveis, workspaceId]);

  React.useEffect(() => {
    if (!workspaceId || !pipelineAtivoId) {
      setDeals([]);
      return;
    }
    carregarDeals(workspaceId, pipelineAtivoId).catch(() => null);
  }, [carregarDeals, pipelineAtivoId, workspaceId]);

  React.useEffect(() => {
    if (!workspaceId) return;

    const carregarProdutos = async () => {
      const { data } = await supabaseClient
        .from("products")
        .select("id, nome")
        .eq("workspace_id", workspaceId)
        .order("nome");

      if (data) {
        setProdutosDisponiveis(data);
      }
    };

    carregarProdutos();
  }, [workspaceId]);

  React.useEffect(() => {
    if (!dealAtivo || !workspaceId) {
      setDialogNotaAberto(false);
      setNotaAtual("");
      setNotasDeal([]);
      setArquivosDeal([]);
      setLogsAuditoriaDeal([]);
      setNotaEditandoId(null);
      setNotaEditandoConteudo("");
      setSalvandoNotaEditada(false);
      setCarregandoDetalhesDeal(false);
      setCarregandoAuditoriaDeal(false);
      return;
    }

    const carregarDetalhes = async () => {
      setCarregandoDetalhesDeal(true);
      setCarregandoAuditoriaDeal(true);

      if (dealAtivo) {
        carregarTimeline(dealAtivo.id);
      }

      const { data: notas } = await supabaseClient
        .from("contact_notes")
        .select("id, conteudo, created_at, autor_id")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", dealAtivo.id)
        .order("created_at", { ascending: false });

      const { data: arquivos } = await supabaseClient
        .from("contact_files")
        .select("id, storage_path, file_name, mime_type, tamanho_bytes, created_at")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", dealAtivo.id)
        .order("created_at", { ascending: false });

      const { data: auditoria } = await supabaseClient
        .from("contact_audit")
        .select("id, acao, detalhes, created_at, autor_id")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", dealAtivo.id)
        .order("created_at", { ascending: false });

      const arquivosComUrl =
        arquivos?.map((arquivo) => ({
          ...arquivo,
          publicUrl: buildR2PublicUrl("contact-files", arquivo.storage_path),
        })) ?? [];

      setNotasDeal(notas ?? []);
      setArquivosDeal(arquivosComUrl);
      setLogsAuditoriaDeal(auditoria ?? []);
      setCarregandoDetalhesDeal(false);
      setCarregandoAuditoriaDeal(false);
    };

    void carregarDetalhes();
  }, [dealAtivo, workspaceId, carregarTimeline]);

  const handleSelecionarPipeline = (pipelineId: string) => {
    setPipelineAtivoId(pipelineId);
    const pipeline = funisDisponiveis.find((funil) => funil.id === pipelineId);
    const etapasPipeline = pipeline?.etapas ?? [];
    setEtapas(etapasPipeline);
    setFunilDestino(pipelineId);
    setEtapaDestino(etapasPipeline[0]?.id ?? "");
    setFiltroEtapa((atual) => {
      if (atual === "todas") return atual;
      const existe = etapasPipeline.some((etapa) => etapa.id === atual);
      return existe ? atual : "todas";
    });
  };

  const handleAbrirExcluirPipeline = (pipeline: FunilConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPipelineParaExcluir(pipeline);
    setDialogExcluirPipelineAberto(true);
  };

  const handleExcluirPipeline = async () => {
    if (!pipelineParaExcluir || !workspaceId) return;

    setExcluindoPipeline(true);

    const { error } = await supabaseClient
      .from("pipelines")
      .delete()
      .eq("id", pipelineParaExcluir.id)
      .eq("workspace_id", workspaceId);

    if (error) {
      setExcluindoPipeline(false);
      return;
    }

    // Se a pipeline excluída era a ativa, selecionar outra
    if (pipelineParaExcluir.id === pipelineAtivoId) {
      const outraPipeline = funisDisponiveis.find(
        (f) => f.id !== pipelineParaExcluir.id
      );
      if (outraPipeline) {
        handleSelecionarPipeline(outraPipeline.id);
      }
    }

    await carregarPipelines(workspaceId, false);
    setExcluindoPipeline(false);
    setDialogExcluirPipelineAberto(false);
    setPipelineParaExcluir(null);
  };

  const atualizarPipelines = React.useCallback(async () => {
    if (!workspaceId) return;
    await carregarPipelines(workspaceId, false);
  }, [carregarPipelines, workspaceId]);

  React.useEffect(() => {
    setLimites((atual) => {
      const proximo = { ...atual };
      etapas.forEach((etapa) => {
        if (!proximo[etapa.id]) {
          proximo[etapa.id] = LIMITE_INICIAL;
        }
      });
      return proximo;
    });
  }, [etapas]);

  React.useEffect(() => {
    if (!modoSelecao) {
      setSelecionados([]);
    }
  }, [modoSelecao]);

  const carregarMotivosPerdaConfigurados = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const response = await fetch("/api/pipeline/loss-reasons", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      lossReasons?: Array<{ titulo: string }>;
    };
    setMotivosPerdaConfigurados(
      (payload.lossReasons ?? []).map((item) => item.titulo)
    );
  }, []);

  React.useEffect(() => {
    carregarMotivosPerdaConfigurados();
  }, [carregarMotivosPerdaConfigurados]);

  React.useEffect(() => {
    if (dialogPerdaAberto) {
      carregarMotivosPerdaConfigurados();
    }
  }, [carregarMotivosPerdaConfigurados, dialogPerdaAberto]);

  const owners = React.useMemo(() => {
    const todos = new Set(deals.map((deal) => deal.owner));
    return ["todos", ...Array.from(todos)];
  }, [deals]);

  const tags = React.useMemo(() => {
    const todos = new Set(deals.flatMap((deal) => deal.tags));
    return ["todas", ...Array.from(todos)];
  }, [deals]);

  const tagsDisponiveisDeal = React.useMemo(() => {
    if (!dealAtivo) return [];
    const termo = novaTagDeal.trim().toLowerCase();
    return tagsDisponiveis.filter((tag) => {
      const jaSelecionada = dealAtivo.tags.some(
        (item) => normalizarTexto(item) === normalizarTexto(tag.nome)
      );
      if (jaSelecionada) return false;
      if (!termo) return true;
      return tag.nome.toLowerCase().includes(termo);
    });
  }, [dealAtivo, novaTagDeal, tagsDisponiveis]);

  const origens = React.useMemo(() => {
    const todos = new Set(deals.map((deal) => deal.origem));
    return ["todas", ...Array.from(todos)];
  }, [deals]);

  const produtos = React.useMemo(() => {
    const todos = new Set(
      deals.map((deal) => deal.produto).filter(Boolean) as string[]
    );
    return ["todos", ...Array.from(todos)];
  }, [deals]);

  const motivosPerda = React.useMemo(() => {
    const todos = new Set(
      deals.map((deal) => deal.motivoPerda).filter(Boolean) as string[]
    );
    motivosPerdaConfigurados.forEach((motivo) => {
      if (motivo) todos.add(motivo);
    });
    return ["todos", ...Array.from(todos)];
  }, [deals, motivosPerdaConfigurados]);

  const etapasFiltro = React.useMemo(
    () => ["todas", ...etapas.map((etapa) => etapa.id)],
    [etapas]
  );

  const filtroAtivoCount = [
    busca.trim().length > 0,
    filtroOwner !== "todos",
    filtroTag !== "todas",
    filtroOrigem !== "todas",
    filtroStatus !== "todos",
    filtroCanal !== "todos",
    filtroValor !== "todos",
    filtroProduto !== "todos",
    filtroMotivoPerda !== "todos",
    filtroEtapa !== "todas",
    filtroDataCampo !== "todas",
    filtroSomenteComEmpresa,
    filtroSomenteComTags,
  ].filter(Boolean).length;

  const obterDataDeal = React.useCallback((deal: DealFunil) => {
    if (filtroDataCampo === "criado-em") return deal.criadoEm;
    if (filtroDataCampo === "ganho-perdido-em") return deal.ganhoPerdidoEm;
    if (filtroDataCampo === "previsao-fechamento")
      return deal.previsaoFechamento;
    if (filtroDataCampo === "ultima-mudanca") return deal.ultimaMudancaEtapa;
    if (filtroDataCampo === "campo-customizado") return deal.customizadoEm;
    return undefined;
  }, [filtroDataCampo]);

  const dentroDoPeriodo = React.useCallback((data?: string) => {
    if (!data) {
      return false;
    }
    if (filtroDataPeriodo === "todas") {
      return true;
    }
    const hoje = new Date();
    const alvo = new Date(data);
    const diffDias = (hoje.getTime() - alvo.getTime()) / (1000 * 60 * 60 * 24);
    if (filtroDataPeriodo === "7d") return diffDias <= 7;
    if (filtroDataPeriodo === "30d") return diffDias <= 30;
    if (filtroDataPeriodo === "90d") return diffDias <= 90;
    return true;
  }, [filtroDataPeriodo]);

  const dealsFiltrados = React.useMemo(() => {
    return deals.filter((deal) => {
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const alvo = [
          deal.nome,
          deal.empresa ?? "",
          deal.owner,
          deal.produto,
          deal.ultimaMensagem,
        ]
          .join(" ")
          .toLowerCase();
        if (!alvo.includes(termo)) {
          return false;
        }
      }
      if (filtroOwner !== "todos" && deal.owner !== filtroOwner) {
        return false;
      }
      if (filtroTag !== "todas" && !deal.tags.includes(filtroTag)) {
        return false;
      }
      if (filtroOrigem !== "todas" && deal.origem !== filtroOrigem) {
        return false;
      }
      if (filtroStatus !== "todos" && deal.status !== filtroStatus) {
        return false;
      }
      if (filtroEtapa !== "todas" && deal.etapaId !== filtroEtapa) {
        return false;
      }
      if (filtroCanal !== "todos" && deal.canal !== filtroCanal) {
        return false;
      }
      if (filtroProduto !== "todos" && deal.produto !== filtroProduto) {
        return false;
      }
      if (
        filtroMotivoPerda !== "todos" &&
        deal.motivoPerda !== filtroMotivoPerda
      ) {
        return false;
      }
      if (filtroSomenteComEmpresa && !deal.empresa) {
        return false;
      }
      if (filtroSomenteComTags && deal.tags.length === 0) {
        return false;
      }
      if (filtroValor !== "todos") {
        if (filtroValor === "ate-20" && deal.valor > 20000) {
          return false;
        }
        if (filtroValor === "20-50" && (deal.valor <= 20000 || deal.valor > 50000)) {
          return false;
        }
        if (filtroValor === "50-100" && (deal.valor <= 50000 || deal.valor > 100000)) {
          return false;
        }
        if (filtroValor === "acima-100" && deal.valor <= 100000) {
          return false;
        }
      }
      if (filtroDataCampo !== "todas") {
        const data = obterDataDeal(deal);
        if (!dentroDoPeriodo(data)) {
          return false;
        }
      }
      return true;
    });
  }, [
    busca,
    deals,
    dentroDoPeriodo,
    filtroCanal,
    filtroDataCampo,
    filtroEtapa,
    filtroMotivoPerda,
    filtroOrigem,
    filtroOwner,
    obterDataDeal,
    filtroProduto,
    filtroSomenteComEmpresa,
    filtroSomenteComTags,
    filtroStatus,
    filtroTag,
    filtroValor,
  ]);

  const dealsPorEtapa = React.useMemo(() => {
    return etapas.reduce((acc, etapa) => {
      acc[etapa.id] = dealsFiltrados.filter(
        (deal) => deal.etapaId === etapa.id
      );
      return acc;
    }, {} as Record<string, DealFunil[]>);
  }, [dealsFiltrados, etapas]);
  const atividadesDeal = dealAtivo
    ? atividadesPorDeal[dealAtivo.id] ?? []
    : [];
  const motivosPerdaValidos = motivosPerda.filter(
    (motivo) => motivo !== "todos"
  );
  const motivosPerdaBase =
    motivosPerdaValidos.length > 0
      ? motivosPerdaValidos
      : motivosPerdaConfigurados.length > 0
        ? motivosPerdaConfigurados
        : ["Sem orçamento", "Sem resposta", "Concorrência"];
  const motivosPerdaOpcoes = Array.from(
    new Set([...motivosPerdaBase, "Outro"])
  );
  const etapaGanho = React.useMemo(
    () =>
      etapas.find(
        (etapa) => etapa.id === "ganho" || slug(etapa.nome) === "ganho"
      ),
    [etapas]
  );

  const iniciaisDeal = React.useCallback(
    (nome: string) =>
      nome
        .split(" ")
        .map((parte) => parte[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    []
  );

  React.useEffect(() => {
    if (dialogCriarNegocioAberto && workspaceId) {
      const fetchContatos = async () => {
        const { data } = await supabaseClient
          .from("contacts")
          .select("id, nome, email, telefone")
          .eq("workspace_id", workspaceId)
          .limit(100);

        if (data) {
          setContatosDisponiveis(
            data.map((c) => ({
              id: c.id,
              nome: c.nome,
              email: c.email,
              telefone: c.telefone,
            }))
          );
        }
      };
      fetchContatos();
    }
  }, [dialogCriarNegocioAberto, workspaceId]);

  const handleScrollColuna = (etapaId: string) => (
    event: React.UIEvent<HTMLDivElement>
  ) => {
    const alvo = event.currentTarget;
    if (alvo.scrollTop + alvo.clientHeight < alvo.scrollHeight - 60) {
      return;
    }
    const total = dealsPorEtapa[etapaId]?.length ?? 0;
    if ((limites[etapaId] ?? LIMITE_INICIAL) >= total) {
      return;
    }
    setLimites((atual) => ({
      ...atual,
      [etapaId]: (atual[etapaId] ?? LIMITE_INICIAL) + LIMITE_INICIAL,
    }));
  };

  const handleToggleSelecionado = (id: string) => {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
    );
  };

  const handleAbrirDeal = (deal: DealFunil) => {
    if (modoSelecao) {
      handleToggleSelecionado(deal.id);
      return;
    }
    setDealAtivo(deal);
  };

  const encontrarTagDisponivel = React.useCallback(
    (tag: string) =>
      tagsDisponiveis.find(
        (item) => normalizarTexto(item.nome) === normalizarTexto(tag)
      ) ?? null,
    [tagsDisponiveis]
  );

  const garantirTagDisponivel = React.useCallback(
    async (tag: string) => {
      const nomeTag = tag.trim();
      if (!nomeTag || !workspaceId) return null;
      const existente = encontrarTagDisponivel(nomeTag);
      if (existente) {
        return {
          ...existente,
          cor: existente.cor ?? "#94a3b8",
        };
      }

      const cor = gerarCorTag();
      const { data, error } = await supabaseClient
        .from("tags")
        .insert({ workspace_id: workspaceId, nome: nomeTag, cor })
        .select("id, nome, cor")
        .single();

      if (error || !data) {
        setErroDados("Não foi possível criar a tag.");
        return null;
      }

      setTagsDisponiveis((atual) => {
        const jaExiste = atual.some(
          (item) => normalizarTexto(item.nome) === normalizarTexto(data.nome)
        );
        if (jaExiste) return atual;
        return [...atual, data];
      });
      setCoresTags((atual) => ({
        ...atual,
        [data.nome]: data.cor ?? cor,
      }));
      return { ...data, cor: data.cor ?? cor };
    },
    [encontrarTagDisponivel, workspaceId]
  );

  const aplicarTagAoDeal = React.useCallback(
    async (dealId: string, tag: string) => {
      const nomeTag = tag.trim();
      if (!nomeTag || !workspaceId) return false;
      setErroDados(null);

      const tagResolvida = await garantirTagDisponivel(nomeTag);
      if (!tagResolvida?.id) return false;

      const { error } = await supabaseClient
        .from("contact_tags")
        .upsert(
          {
            workspace_id: workspaceId,
            contact_id: dealId,
            tag_id: tagResolvida.id,
          },
          { onConflict: "contact_id,tag_id" }
        );

      if (error) {
        setErroDados("Não foi possível vincular a tag.");
        return false;
      }

      setCoresTags((atual) => ({
        ...atual,
        [tagResolvida.nome]: tagResolvida.cor ?? "#94a3b8",
      }));

      setDeals((atual) =>
        atual.map((deal) => {
          if (deal.id !== dealId) return deal;
          const tagsAtualizadas = Array.from(
            new Set([...deal.tags, tagResolvida.nome])
          );
          return { ...deal, tags: tagsAtualizadas };
        })
      );
      setDealAtivo((atual) => {
        if (!atual || atual.id !== dealId) return atual;
        const tagsAtualizadas = Array.from(
          new Set([...atual.tags, tagResolvida.nome])
        );
        return { ...atual, tags: tagsAtualizadas };
      });

      registrarAtividade(dealId, "tag_adicionada", { tag: tagResolvida.nome });

      return true;
    },
    [garantirTagDisponivel, workspaceId, registrarAtividade]
  );

  const removerTagDoDeal = React.useCallback(
    async (dealId: string, tag: string) => {
      const nomeTag = tag.trim();
      if (!nomeTag || !workspaceId) return false;
      setErroDados(null);

      let tagId = encontrarTagDisponivel(nomeTag)?.id ?? null;
      if (!tagId) {
        const { data } = await supabaseClient
          .from("tags")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("nome", nomeTag)
          .maybeSingle();
        tagId = data?.id ?? null;
      }

      if (!tagId) {
        setErroDados("Tag não encontrada.");
        return false;
      }

      const { error } = await supabaseClient
        .from("contact_tags")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("contact_id", dealId)
        .eq("tag_id", tagId);

      if (error) {
        setErroDados("Não foi possível remover a tag.");
        return false;
      }

      setDeals((atual) =>
        atual.map((deal) =>
          deal.id === dealId
            ? {
              ...deal,
              tags: deal.tags.filter((item) => item !== nomeTag),
            }
            : deal
        )
      );
      setDealAtivo((atual) =>
        atual && atual.id === dealId
          ? { ...atual, tags: atual.tags.filter((item) => item !== nomeTag) }
          : atual
      );

      registrarAtividade(dealId, "tag_removida", { tag: nomeTag });
      return true;
    },
    [encontrarTagDisponivel, workspaceId, registrarAtividade]
  );

  const handleAplicarTag = async (tag: string) => {
    if (!tag || selecionados.length === 0 || !workspaceId) return;
    setErroDados(null);

    const tagResolvida = await garantirTagDisponivel(tag);
    if (!tagResolvida?.id) return;

    const payload = selecionados.map((dealId) => ({
      workspace_id: workspaceId,
      contact_id: dealId,
      tag_id: tagResolvida.id,
    }));

    const { error } = await supabaseClient
      .from("contact_tags")
      .upsert(payload, { onConflict: "contact_id,tag_id" });

    if (error) {
      setErroDados("Não foi possível aplicar a tag.");
      return;
    }

    setCoresTags((atual) => ({
      ...atual,
      [tagResolvida.nome]: tagResolvida.cor ?? "#94a3b8",
    }));
    setDeals((atual) =>
      atual.map((deal) =>
        selecionados.includes(deal.id)
          ? {
            ...deal,
            tags: Array.from(new Set([...deal.tags, tagResolvida.nome])),
          }
          : deal
      )
    );
    setDealAtivo((atual) =>
      atual && selecionados.includes(atual.id)
        ? {
          ...atual,
          tags: Array.from(new Set([...atual.tags, tagResolvida.nome])),
        }
        : atual
    );
  };

  const handleAplicarOwner = (owner: string) => {
    if (!owner || selecionados.length === 0) return;
    setDeals((atual) =>
      atual.map((deal) =>
        selecionados.includes(deal.id) ? { ...deal, owner } : deal
      )
    );
    // Log for active deal if selected
    if (dealAtivo && selecionados.includes(dealAtivo.id)) {
      registrarAtividade(dealAtivo.id, "owner_alterado", { novo_owner: owner });
    } else {
      // Optimistically log for the first one if multiple? Ideally should loop but keep it simple for now to avoid spam
      selecionados.forEach(id => {
        registrarAtividade(id, "owner_alterado", { novo_owner: owner });
      });
    }
  };

  const atualizarDeal = React.useCallback(
    (id: string, atualizacao: Partial<DealFunil>) => {
      setDeals((atual) =>
        atual.map((deal) =>
          deal.id === id ? { ...deal, ...atualizacao } : deal
        )
      );
      setDealAtivo((atual) =>
        atual && atual.id === id ? { ...atual, ...atualizacao } : atual
      );
    },
    []
  );

  const handleAbrirEditarDeal = () => {
    if (!dealAtivo) return;
    setFormEditarDeal({
      nome: dealAtivo.nome,
      empresa: dealAtivo.empresa ?? "",
      valor: String(dealAtivo.valor),
      moeda: dealAtivo.moeda,
      owner: dealAtivo.owner,
      produto: dealAtivo.produto,
    });
    setDialogEditarDealAberto(true);
  };

  const handleSalvarEditarDeal = () => {
    if (!dealAtivo) return;
    atualizarDeal(dealAtivo.id, {
      nome: formEditarDeal.nome,
      empresa: formEditarDeal.empresa || undefined,
      valor: Number(formEditarDeal.valor || 0),
      moeda: formEditarDeal.moeda as DealFunil["moeda"],
      owner: formEditarDeal.owner,
      produto: formEditarDeal.produto,
    });
    registrarAtividade(dealAtivo.id, "edicao", { campos_alterados: Object.keys(formEditarDeal) });
    setDialogEditarDealAberto(false);
  };

  const handleAdicionarTagDeal = async () => {
    if (!dealAtivo) return;
    const tag = novaTagDeal.trim();
    if (!tag) return;
    const ok = await aplicarTagAoDeal(dealAtivo.id, tag);
    if (ok) {
      setNovaTagDeal("");
    }
  };

  const handleAbrirTagRapida = (dealId: string) => {
    setTagRapidaId(dealId);
    setTagRapidaValor("");
  };

  const handleSalvarTagRapida = async (dealId: string) => {
    const tag = tagRapidaValor.trim();
    if (!tag) return;
    const ok = await aplicarTagAoDeal(dealId, tag);
    if (ok) {
      setTagRapidaId(null);
      setTagRapidaValor("");
    }
  };

  const handleRemoverTagDeal = async (tag: string) => {
    if (!dealAtivo) return;
    await removerTagDoDeal(dealAtivo.id, tag);
  };

  const handleAbrirGanho = () => {
    if (!dealAtivo) return;
    setDialogGanhoAberto(true);
  };

  const handleConfirmarGanho = () => {
    if (!dealAtivo) return;
    atualizarDeal(dealAtivo.id, {
      status: "ganho",
      motivoPerda: undefined,
      etapaId: etapaGanho?.id ?? dealAtivo.etapaId,
    });
    // TODO: updates table status
    registrarAtividade(dealAtivo.id, "ganho");
    setDialogGanhoAberto(false);
  };

  const handleAbrirPerda = () => {
    if (!dealAtivo) return;
    const motivoAtual = dealAtivo.motivoPerda ?? "Sem orçamento";
    if (motivoAtual && !motivosPerdaOpcoes.includes(motivoAtual)) {
      setMotivoPerdaSelecionado("Outro");
      setMotivoPerdaOutro(motivoAtual);
    } else {
      setMotivoPerdaSelecionado(motivoAtual);
      setMotivoPerdaOutro(motivoAtual === "Outro" ? "" : "");
    }
    setDialogPerdaAberto(true);
  };

  const handleConfirmarPerda = () => {
    if (!dealAtivo) return;
    const motivoFinal =
      motivoPerdaSelecionado === "Outro"
        ? motivoPerdaOutro.trim() || "Outro"
        : motivoPerdaSelecionado;
    atualizarDeal(dealAtivo.id, {
      status: "perdido",
      motivoPerda: motivoFinal,
    });
    setDialogPerdaAberto(false);
  };

  const handleExcluirDeal = async () => {
    if (!dealAtivo || !workspaceId) return;

    setDeals((atual) => atual.filter((deal) => deal.id !== dealAtivo.id));
    setDialogExcluirDealAberto(false);

    // Remove from pipeline by clearing pipeline fields in contact
    const { error } = await supabaseClient
      .from("contacts")
      .update({ pipeline_id: null, pipeline_stage_id: null })
      .eq("id", dealAtivo.id)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Erro ao excluir negócio:", error);
      setErroDados("Não foi possível excluir o negócio. Atualize a página e tente novamente.");
      // Rollback optimistic update implementation would be complex here, 
      // but reloading deals is a safe fallback if it fails.
      await carregarDeals(workspaceId, pipelineAtivoId);
    }

    setDealAtivo(null);
  };

  const handleSalvarNota = async (fecharDialogo = false) => {
    if (!dealAtivo || !workspaceId || !session || !notaAtual.trim()) return;

    setEnviandoNota(true);

    const { data, error } = await supabaseClient
      .from("contact_notes")
      .insert({
        workspace_id: workspaceId,
        contact_id: dealAtivo.id,
        autor_id: session.user.id,
        conteudo: notaAtual.trim(),
      })
      .select("id, conteudo, created_at, autor_id")
      .single();

    if (error || !data) {
      setErroDados("Não foi possível salvar a nota.");
      setEnviandoNota(false);
      return;
    }

    setNotasDeal((atual) => [data, ...atual]);
    setNotaAtual("");
    setEnviandoNota(false);

    await registrarAuditoria({
      contatoId: dealAtivo.id,
      acao: "Nota adicionada",
      detalhes: { mensagem: "Nota interna adicionada." },
    });
    await registrarAtividade(dealAtivo.id, "nota_adicionada", { resumo: notaAtual.substring(0, 50) });

    if (fecharDialogo) {
      setDialogNotaAberto(false);
    }
  };

  const handleIniciarEdicaoNota = (nota: NotaContato) => {
    setNotaEditandoId(nota.id);
    setNotaEditandoConteudo(nota.conteudo);
  };

  const handleCancelarEdicaoNota = () => {
    setNotaEditandoId(null);
    setNotaEditandoConteudo("");
    setSalvandoNotaEditada(false);
  };

  const handleSalvarNotaEditada = async () => {
    if (
      !notaEditandoId ||
      !notaEditandoConteudo.trim() ||
      !workspaceId ||
      !dealAtivo
    ) {
      return;
    }

    setSalvandoNotaEditada(true);

    const { error } = await supabaseClient
      .from("contact_notes")
      .update({ conteudo: notaEditandoConteudo.trim() })
      .eq("id", notaEditandoId)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Não foi possível atualizar a nota.");
      setSalvandoNotaEditada(false);
      return;
    }

    setNotasDeal((atual) =>
      atual.map((nota) =>
        nota.id === notaEditandoId
          ? { ...nota, conteudo: notaEditandoConteudo.trim() }
          : nota
      )
    );

    await registrarAuditoria({
      contatoId: dealAtivo.id,
      acao: "Nota editada",
      detalhes: { mensagem: "Nota interna atualizada." },
    });

    handleCancelarEdicaoNota();
  };

  const handleExcluirNota = async (notaId: string) => {
    if (!dealAtivo || !workspaceId) return;

    const { error } = await supabaseClient
      .from("contact_notes")
      .delete()
      .eq("id", notaId)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Não foi possível excluir a nota.");
      return;
    }

    setNotasDeal((atual) => atual.filter((nota) => nota.id !== notaId));
    if (notaEditandoId === notaId) {
      handleCancelarEdicaoNota();
    }

    await registrarAuditoria({
      contatoId: dealAtivo.id,
      acao: "Nota removida",
      detalhes: { mensagem: "Nota interna removida." },
    });
  };

  const handleSelecionarArquivoDeal = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo || !dealAtivo || !workspaceId || !session) {
      return;
    }

    setEnviandoArquivoDeal(true);

    const nomeSeguro = arquivo.name.replace(/[^\w.-]/g, "_");
    const caminho = `${workspaceId}/${dealAtivo.id}/${Date.now()}-${nomeSeguro}`;

    const token = await obterToken();
    if (!token) {
      setErroDados("Sessão expirada.");
      setEnviandoArquivoDeal(false);
      event.target.value = "";
      return;
    }

    try {
      await uploadFileToR2({
        token,
        bucket: "contact-files",
        key: caminho,
        file: arquivo,
      });
    } catch (error) {
      setErroDados("Não foi possível enviar o arquivo.");
      setEnviandoArquivoDeal(false);
      event.target.value = "";
      return;
    }

    const { data: registro, error: registroErro } = await supabaseClient
      .from("contact_files")
      .insert({
        workspace_id: workspaceId,
        contact_id: dealAtivo.id,
        autor_id: session.user.id,
        storage_path: caminho,
        file_name: arquivo.name,
        mime_type: arquivo.type || null,
        tamanho_bytes: arquivo.size,
      })
      .select("id, storage_path, file_name, mime_type, tamanho_bytes, created_at")
      .single();

    if (registroErro || !registro) {
      setErroDados("Não foi possível registrar o arquivo.");
      setEnviandoArquivoDeal(false);
      event.target.value = "";
      return;
    }

    const publicUrl = buildR2PublicUrl("contact-files", caminho);

    setArquivosDeal((atual) => [
      { ...registro, publicUrl: publicUrl ?? undefined },
      ...atual,
    ]);
    await registrarAuditoria({
      contatoId: dealAtivo.id,
      acao: "Arquivo enviado",
      detalhes: { mensagem: `Arquivo ${arquivo.name} enviado.` },
    });
    await registrarAtividade(dealAtivo.id, "arquivo_adicionado", { nome_arquivo: arquivo.name });
    setEnviandoArquivoDeal(false);
    event.target.value = "";
  };

  const handleExcluirArquivoDeal = (arquivo: ArquivoContato) => {
    setArquivoExcluindo(arquivo);
    setDialogExcluirArquivoAberto(true);
  };

  const handleConfirmarExclusaoArquivo = async () => {
    if (!dealAtivo || !workspaceId || !arquivoExcluindo) return;

    setArquivoExcluindoId(arquivoExcluindo.id);

    const token = await obterToken();
    if (!token) {
      setErroDados("Sessão expirada.");
      setArquivoExcluindoId(null);
      setDialogExcluirArquivoAberto(false);
      return;
    }

    try {
      await deleteR2Object({
        token,
        bucket: "contact-files",
        key: arquivoExcluindo.storage_path,
      });
    } catch (error) {
      setErroDados("Não foi possível excluir o arquivo.");
      setArquivoExcluindoId(null);
      setDialogExcluirArquivoAberto(false);
      return;
    }

    const { error: bancoErro } = await supabaseClient
      .from("contact_files")
      .delete()
      .eq("id", arquivoExcluindo.id)
      .eq("workspace_id", workspaceId);

    if (bancoErro) {
      setErroDados("Não foi possível excluir o arquivo.");
      setArquivoExcluindoId(null);
      setDialogExcluirArquivoAberto(false);
      return;
    }

    setArquivosDeal((atual) => atual.filter((item) => item.id !== arquivoExcluindo.id));

    await registrarAuditoria({
      contatoId: dealAtivo.id,
      acao: "Arquivo removido",
      detalhes: { mensagem: `Arquivo ${arquivoExcluindo.file_name} removido.` },
    });

    setArquivoExcluindoId(null);
    setDialogExcluirArquivoAberto(false);
    setArquivoExcluindo(null);
  };


  const handleCriarNegocio = async () => {
    if (!novoNegocio.nome.trim()) {
      setErroDados("O nome do negócio é obrigatório.");
      return;
    }
    if (!novoNegocio.funilId) {
      setErroDados("Selecione um funil.");
      return;
    }
    if (!novoNegocio.etapaId) {
      setErroDados("Selecione uma etapa.");
      return;
    }
    if (!workspaceId || !session) return;

    setEnviandoNovoNegocio(true);
    setErroDados(null);

    const valorNumerico = novoNegocio.valor
      ? Number.parseFloat(
        novoNegocio.valor
          .replace("R$", "")
          .replace(/\./g, "")
          .replace(",", ".")
          .trim()
      )
      : 0;

    // 1. Lookup avatar from lead by phone number or from linked contact
    let avatarUrl: string | null = null;

    // First, try to get avatar from linked contact
    if (novoNegocio.contatoId) {
      const { data: contactData } = await supabaseClient
        .from("contacts")
        .select("avatar_url")
        .eq("id", novoNegocio.contatoId)
        .maybeSingle();
      if (contactData?.avatar_url) {
        avatarUrl = contactData.avatar_url;
      }
    }

    // If no avatar from contact, try to lookup from leads by phone
    if (!avatarUrl && novoNegocio.telefone) {
      const telefoneNormalizado = novoNegocio.telefone.replace(/\D/g, "");
      const { data: leadData } = await supabaseClient
        .from("leads")
        .select("avatar_url")
        .eq("workspace_id", workspaceId)
        .or(`telefone.ilike.%${telefoneNormalizado}%,whatsapp_wa_id.ilike.%${telefoneNormalizado}%`)
        .not("avatar_url", "is", null)
        .limit(1)
        .maybeSingle();
      if (leadData?.avatar_url) {
        avatarUrl = leadData.avatar_url;
      }
    }

    // 2. Insert Deal into deals table
    const { data: novoDeal, error: erroDeal } = await supabaseClient
      .from("deals")
      .insert({
        workspace_id: workspaceId,
        titulo: novoNegocio.nome,
        valor: valorNumerico,
        moeda: "BRL",
        contact_id: novoNegocio.contatoId || null,
        pipeline_id: novoNegocio.funilId,
        stage_id: novoNegocio.etapaId,
        owner_id: (novoNegocio.ownerId && novoNegocio.ownerId !== "todos") ? novoNegocio.ownerId : session.user.id,
        status: "aberto",
        origem: "CRM",
        avatar_url: avatarUrl,
      })
      .select("id, titulo, valor, moeda, created_at, status, pipeline_id, stage_id, owner_id, contact_id, avatar_url")
      .single();

    if (erroDeal || !novoDeal) {
      console.error("Erro ao criar negócio:", JSON.stringify(erroDeal, null, 2));
      setErroDados("Erro ao criar negócio. Tente novamente.");
      setEnviandoNovoNegocio(false);
      return;
    }

    // 1.6 Update linked contact's pipeline/stage and sync tags if a contact was selected
    if (novoNegocio.contatoId) {
      // Update pipeline and stage
      await supabaseClient
        .from("contacts")
        .update({
          pipeline_id: novoNegocio.funilId,
          pipeline_stage_id: novoNegocio.etapaId,
        })
        .eq("id", novoNegocio.contatoId);

      // Sync tags to the linked contact (if tags were assigned to the deal)
      if (novoNegocio.tags && novoNegocio.tags.length > 0) {
        const tagIdsParaContato: string[] = [];

        for (const tagNome of novoNegocio.tags) {
          const tagExistente = tagsDisponiveis.find(
            (t) => t.nome.toLowerCase() === tagNome.toLowerCase()
          );
          if (tagExistente) {
            tagIdsParaContato.push(tagExistente.id);
          } else {
            // Create new tag if it doesn't exist
            const { data: novaTag } = await supabaseClient
              .from("tags")
              .insert({
                workspace_id: workspaceId,
                nome: tagNome,
                cor: gerarCorTag(),
              })
              .select("id")
              .single();
            if (novaTag) tagIdsParaContato.push(novaTag.id);
          }
        }

        if (tagIdsParaContato.length > 0) {
          const tagsPayloadContato = tagIdsParaContato.map(tagId => ({
            workspace_id: workspaceId,
            contact_id: novoNegocio.contatoId,
            tag_id: tagId
          }));
          await supabaseClient.from("contact_tags").upsert(tagsPayloadContato, { onConflict: 'contact_id,tag_id' });
        }
      }
    }

    // 1.5 Handle Tags
    if (novoNegocio.tags && novoNegocio.tags.length > 0) {
      const tagIds: string[] = [];

      for (const tagNome of novoNegocio.tags) {
        // Check if tag exists (case insensitive)
        const tagExistente = tagsDisponiveis.find(
          (t) => t.nome.toLowerCase() === tagNome.toLowerCase()
        );

        if (tagExistente) {
          tagIds.push(tagExistente.id);
        } else {
          // Create new tag
          const { data: novaTag } = await supabaseClient
            .from("tags")
            .insert({
              workspace_id: workspaceId,
              nome: tagNome,
              cor: gerarCorTag(), // Helper checking if imported, otherwise standard
            })
            .select("id")
            .single();

          if (novaTag) tagIds.push(novaTag.id);
        }
      }

      if (tagIds.length > 0) {
        const tagsPayload = tagIds.map(tagId => ({
          workspace_id: workspaceId,
          contact_id: novoDeal.id,
          tag_id: tagId
        }));
        await supabaseClient.from("contact_tags").upsert(tagsPayload, { onConflict: 'contact_id,tag_id' });
      }
    }

    // 2. Insert Note (if any)
    if (novoNegocio.nota.trim()) {
      await supabaseClient.from("contact_notes").insert({
        workspace_id: workspaceId,
        contact_id: novoDeal.id,
        autor_id: session.user.id,
        conteudo: novoNegocio.nota.trim(),
      });

      await registrarAtividade(novoDeal.id, "nota_adicionada", {
        resumo: novoNegocio.nota.substring(0, 50),
      });
    }

    // 3. Upload Files (if any)
    if (novoNegocio.arquivos.length > 0) {
      const token = await obterToken();
      if (token) {
        for (const arquivo of novoNegocio.arquivos) {
          try {
            const nomeSeguro = arquivo.name.replace(/[^\w.-]/g, "_");
            const caminho = `${workspaceId}/${novoDeal.id}/${Date.now()}-${nomeSeguro}`;

            await uploadFileToR2({
              token,
              bucket: "contact-files",
              key: caminho,
              file: arquivo,
            });

            await supabaseClient.from("contact_files").insert({
              workspace_id: workspaceId,
              contact_id: novoDeal.id,
              autor_id: session.user.id,
              storage_path: caminho,
              file_name: arquivo.name,
              mime_type: arquivo.type || null,
              tamanho_bytes: arquivo.size,
            });
          } catch (error) {
            console.error(`Erro ao enviar arquivo ${arquivo.name}:`, error);
            // Continue uploading other files even if one fails
          }
        }
        await registrarAtividade(novoDeal.id, "arquivo_adicionado", {
          quantidade: novoNegocio.arquivos.length,
        });
      }
    }

    // 4. Finalize
    await registrarAuditoria({
      contatoId: novoDeal.id,
      acao: "Negócio criado manualmente",
      detalhes: { nome: novoNegocio.nome, valor: valorNumerico },
    });

    // Refresh deals list logic is complex (optimistic vs refetch). 
    // Here we'll just push to state if it matches current filter, easier to Refetch or just append if simple.
    // Given the complexity of filters, easiest is to append if it matches the current pipeline.

    // Convert DB type to UI type 'DealFunil' roughly
    const novoDealFormatado: DealFunil = {
      id: novoDeal.id,
      nome: novoDeal.titulo,
      valor: novoDeal.valor || 0,
      criadoEm: novoDeal.created_at,
      status: novoDeal.status,
      funilId: novoDeal.pipeline_id,
      etapaId: novoDeal.stage_id,
      owner: owners.find(o => o === novoNegocio.ownerId) || "Você",
      tags: novoNegocio.tags || [], // Use local tags since we just inserted them
      avatarUrl: novoDeal.avatar_url ?? undefined,
      moeda: novoDeal.moeda || "BRL",
      empresa: undefined,
      telefone: "",
      produto: "Negócio",
      ultimaAtividade: formatarDataCurta(novoDeal.created_at),
      ultimaMensagem: "Novo negócio criado",
      canal: "whatsapp",
      origem: "CRM",
      ultimaMudancaEtapa: novoDeal.created_at,
    };

    // Only add to state if it belongs to current pipeline view
    // We need to fetch the funnel info properly or just reload page/data. 
    // For now, let's append to 'deals' state list.
    setDeals(atual => [novoDealFormatado, ...atual]);

    setEnviandoNovoNegocio(false);
    setDialogCriarNegocioAberto(false);

    // Reset form
    setNovoNegocio({
      nome: "",
      valor: "",
      email: "",
      telefone: "",
      funilId: "",
      etapaId: "",
      ownerId: "",
      tags: [],
      nota: "",
      arquivos: [],
      contatoId: "",
    });
  };
  const handleSalvarAtividade = () => {
    if (!dealAtivo || !atividadeAtual.titulo.trim()) return;
    setAtividadesPorDeal((atual) => ({
      ...atual,
      [dealAtivo.id]: [
        ...(atual[dealAtivo.id] ?? []),
        {
          titulo: atividadeAtual.titulo.trim(),
          data: atividadeAtual.data,
          hora: atividadeAtual.hora,
          responsavel: atividadeAtual.responsavel,
        },
      ],
    }));
    setAtividadeAtual({ titulo: "", data: "", hora: "", responsavel: "" });
    setDialogAtividadeAberto(false);
  };

  const handleAbrirMoverDeal = () => {
    if (!dealAtivo) return;
    setFunilDestino(dealAtivo.funilId);
    setEtapaDestino(dealAtivo.etapaId);
    setDialogMoverDealAberto(true);
  };

  const handleSalvarMoverDeal = async () => {
    if (!dealAtivo || !workspaceId) return;
    const novaEtapa = etapaDestino || dealAtivo.etapaId;

    const { error } = await supabaseClient
      .from("contacts")
      .update({
        pipeline_id: funilDestino,
        pipeline_stage_id: novaEtapa,
      })
      .eq("id", dealAtivo.id)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Não foi possível mover o contato de etapa.");
      return;
    }

    setDeals((atual) => {
      if (funilDestino !== pipelineAtivoId) {
        return atual.filter((deal) => deal.id !== dealAtivo.id);
      }
      return atual.map((deal) =>
        deal.id === dealAtivo.id
          ? { ...deal, funilId: funilDestino, etapaId: novaEtapa }
          : deal
      );
    });

    const nomeEtapaDestino = etapas.find(e => e.id === novaEtapa)?.nome || novaEtapa;
    const nomeFunilDestino = funisDisponiveis.find(p => p.id === funilDestino)?.nome || funilDestino;
    await registrarAtividade(dealAtivo.id, "movimentacao", { para_etapa_nome: nomeEtapaDestino, para_funil_nome: nomeFunilDestino });

    if (funilDestino !== pipelineAtivoId) {
      setDealAtivo(null);
    }
    setDialogMoverDealAberto(false);
  };

  const handleSalvarMoverSelecionados = async () => {
    if (selecionados.length === 0 || !workspaceId) return;
    const novaEtapa = etapaDestino; // Default to target stage
    if (!novaEtapa || !funilDestino) return;

    setCarregando(true); // Reuse main loading or create specific

    const { error } = await supabaseClient
      .from("contacts")
      .update({
        pipeline_id: funilDestino,
        pipeline_stage_id: novaEtapa,
      })
      .in("id", selecionados)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Não foi possível mover os contatos selecionados.");
      setCarregando(false);
      return;
    }

    const nomeEtapaDestino = etapas.find(e => e.id === novaEtapa)?.nome || novaEtapa;
    const nomeFunilDestino = funisDisponiveis.find(p => p.id === funilDestino)?.nome || funilDestino;

    // Register activity for each deal
    // We do this in background to not block UI too much, or await if critical
    selecionados.forEach(async (id) => {
      await registrarAtividade(id, "movimentacao", { para_etapa_nome: nomeEtapaDestino, para_funil_nome: nomeFunilDestino });
    });

    setDeals((atual) => {
      // Remove if moved to another pipeline
      if (funilDestino !== pipelineAtivoId) {
        return atual.filter((deal) => !selecionados.includes(deal.id));
      }
      // Update stage if same pipeline
      return atual.map((deal) =>
        selecionados.includes(deal.id)
          ? { ...deal, funilId: funilDestino, etapaId: novaEtapa }
          : deal
      );
    });

    setSelecionados([]);
    setModoSelecao(false);
    setDialogMoverSelecionadosAberto(false);
    setCarregando(false);
  };

  const handleExcluirSelecionados = () => {
    setDeals((atual) => atual.filter((deal) => !selecionados.includes(deal.id)));
    setSelecionados([]);
    setDialogExcluirAberto(false);
  };

  const handleDragStart = (dealId: string) => (event: React.DragEvent) => {
    event.dataTransfer.setData("text/plain", dealId);
    setArrastandoId(dealId);
  };

  const handleDrop = (etapaId: string) => async (event: React.DragEvent) => {
    event.preventDefault();
    const dealId = event.dataTransfer.getData("text/plain") || arrastandoId;
    if (!dealId || !workspaceId) return;

    const { error } = await supabaseClient
      .from("contacts")
      .update({ pipeline_stage_id: etapaId })
      .eq("id", dealId)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Não foi possível atualizar a etapa do contato.");
      return;
    }

    const nomeEtapa = etapas.find(e => e.id === etapaId)?.nome || etapaId;
    await registrarAtividade(dealId, "movimentacao", { para_etapa_nome: nomeEtapa });

    setDeals((atual) => {
      const indice = atual.findIndex((deal) => deal.id === dealId);
      if (indice === -1) return atual;
      const dealAtualizado = { ...atual[indice], etapaId };
      const restantes = atual.filter((deal) => deal.id !== dealId);
      const destinoIndex = restantes.findIndex(
        (deal) => deal.etapaId === etapaId
      );
      if (destinoIndex === -1) {
        return [dealAtualizado, ...restantes];
      }
      return [
        ...restantes.slice(0, destinoIndex),
        dealAtualizado,
        ...restantes.slice(destinoIndex),
      ];
    });
    setArrastandoId(null);
    setColunaEmHover(null);
  };

  const handleAbrirNovoFunil = () => {
    setFormNovoFunil({ nome: "", descricao: "" });
    const etapasBase =
      etapas.length > 0
        ? etapas.map((etapa) => ({ ...etapa }))
        : [{ id: "novo-lead", nome: "Novo Lead", cor: "#2563eb" }];
    setEtapasNovoFunil(etapasBase);
    setNovaEtapaNovoFunil({ nome: "", cor: "#94a3b8" });
    setDialogNovoFunilAberto(true);
  };

  const handleAdicionarEtapaNovoFunil = () => {
    const nome = novaEtapaNovoFunil.nome.trim();
    if (!nome) return;
    const baseId = slug(nome) || `etapa-${etapasNovoFunil.length + 1}`;
    let id = baseId;
    let contador = 1;
    while (etapasNovoFunil.some((etapa) => etapa.id === id)) {
      contador += 1;
      id = `${baseId}-${contador}`;
    }
    setEtapasNovoFunil((atual) => [
      ...atual,
      { id, nome, cor: novaEtapaNovoFunil.cor || "#94a3b8" },
    ]);
    setNovaEtapaNovoFunil({ nome: "", cor: "#94a3b8" });
  };

  const handleAtualizarEtapaNovoFunil = (
    id: string,
    atualizacao: Partial<EtapaFunil>
  ) => {
    setEtapasNovoFunil((atual) =>
      atual.map((etapa) =>
        etapa.id === id ? { ...etapa, ...atualizacao } : etapa
      )
    );
  };

  const handleRemoverEtapaNovoFunil = (id: string) => {
    setEtapasNovoFunil((atual) => {
      if (atual.length <= 1) return atual;
      return atual.filter((etapa) => etapa.id !== id);
    });
  };

  const handleSalvarNovoFunil = async () => {
    const nome = formNovoFunil.nome.trim();
    if (!nome || !workspaceId) return;
    const etapasValidas = etapasNovoFunil
      .map((etapa) => ({
        ...etapa,
        nome: etapa.nome.trim(),
      }))
      .filter((etapa) => etapa.nome);
    if (etapasValidas.length === 0) return;

    setErroDados(null);

    const { data: pipeline, error: pipelineError } = await supabaseClient
      .from("pipelines")
      .insert({
        workspace_id: workspaceId,
        nome,
        descricao: formNovoFunil.descricao.trim() || null,
      })
      .select("id")
      .single();

    if (pipelineError || !pipeline?.id) {
      setErroDados("Não foi possível criar o funil.");
      return;
    }

    const etapasInsert = etapasValidas.map((etapa, index) => ({
      pipeline_id: pipeline.id,
      nome: etapa.nome,
      cor: etapa.cor ?? "#94a3b8",
      ordem: index + 1,
    }));

    const { error: etapasError } = await supabaseClient
      .from("pipeline_stages")
      .insert(etapasInsert);

    if (etapasError) {
      setErroDados("Não foi possível criar as etapas do funil.");
      return;
    }

    await carregarPipelines(workspaceId, false, pipeline.id);
    setDialogNovoFunilAberto(false);
  };

  const handleAdicionarEtapa = async () => {
    const nome = novaEtapa.trim();
    if (!nome || !pipelineAtivoId) return;

    setErroDados(null);

    const { error } = await supabaseClient.from("pipeline_stages").insert({
      pipeline_id: pipelineAtivoId,
      nome,
      cor: "#94a3b8",
      ordem: etapas.length + 1,
    });

    if (error) {
      setErroDados("Não foi possível adicionar a etapa.");
      return;
    }

    setNovaEtapa("");
    await atualizarPipelines();
  };

  const handleRenomearEtapa = (id: string, nome: string) => {
    setEtapas((atual) =>
      atual.map((etapa) => (etapa.id === id ? { ...etapa, nome } : etapa))
    );
  };

  const handleSalvarRenomearEtapa = async (id: string, nome: string) => {
    const nomeFinal = nome.trim();
    if (!nomeFinal) {
      await atualizarPipelines();
      return;
    }

    const { error } = await supabaseClient
      .from("pipeline_stages")
      .update({ nome: nomeFinal })
      .eq("id", id);

    if (error) {
      setErroDados("Não foi possível renomear a etapa.");
      return;
    }

    await atualizarPipelines();
  };

  const handleAtualizarCorEtapa = async (id: string, cor: string) => {
    setEtapas((atual) =>
      atual.map((etapa) => (etapa.id === id ? { ...etapa, cor } : etapa))
    );

    const { error } = await supabaseClient
      .from("pipeline_stages")
      .update({ cor })
      .eq("id", id);

    if (error) {
      setErroDados("Não foi possível atualizar a cor da etapa.");
      return;
    }

    await atualizarPipelines();
  };

  const persistirOrdemEtapas = async (etapasAtualizadas: EtapaFunil[]) => {
    const temporarias = etapasAtualizadas.map((etapa, index) => ({
      id: etapa.id,
      ordem: -(index + 1),
    }));

    const resultadoTemp = await Promise.all(
      temporarias.map((item) =>
        supabaseClient
          .from("pipeline_stages")
          .update({ ordem: item.ordem })
          .eq("id", item.id)
      )
    );

    if (resultadoTemp.some((resultado) => resultado.error)) {
      setErroDados("Não foi possível reordenar as etapas.");
      return false;
    }

    const finais = etapasAtualizadas.map((etapa, index) => ({
      id: etapa.id,
      ordem: index + 1,
    }));

    const resultadoFinal = await Promise.all(
      finais.map((item) =>
        supabaseClient
          .from("pipeline_stages")
          .update({ ordem: item.ordem })
          .eq("id", item.id)
      )
    );

    if (resultadoFinal.some((resultado) => resultado.error)) {
      setErroDados("Não foi possível reordenar as etapas.");
      return false;
    }

    return true;
  };

  const handleMoverEtapa = async (id: string, direcao: "up" | "down") => {
    const index = etapas.findIndex((etapa) => etapa.id === id);
    const destino = direcao === "up" ? index - 1 : index + 1;
    if (index < 0 || destino < 0 || destino >= etapas.length) {
      return;
    }
    const copia = [...etapas];
    [copia[index], copia[destino]] = [copia[destino], copia[index]];
    setEtapas(copia);

    const ok = await persistirOrdemEtapas(copia);
    if (ok) {
      await atualizarPipelines();
    }
  };

  const handleRemoverEtapa = async (id: string) => {
    const index = etapas.findIndex((etapa) => etapa.id === id);
    if (index < 0) return;
    const destino =
      etapas[index + 1]?.id ?? etapas[index - 1]?.id ?? "";

    setEtapas((atual) => atual.filter((etapa) => etapa.id !== id));

    if (destino) {
      const { error: moverErro } = await supabaseClient
        .from("contacts")
        .update({ pipeline_stage_id: destino })
        .eq("pipeline_stage_id", id);
      if (moverErro) {
        setErroDados("Não foi possível mover contatos desta etapa.");
      }
    }

    const { error } = await supabaseClient
      .from("pipeline_stages")
      .delete()
      .eq("id", id);

    if (error) {
      setErroDados("Não foi possível remover a etapa.");
      await atualizarPipelines();
      return;
    }

    if (filtroEtapa === id) {
      setFiltroEtapa("todas");
    }

    await atualizarPipelines();
  };

  const handleSolicitarRemocaoEtapa = (etapa: EtapaFunil) => {
    setEtapaParaExcluir(etapa);
    setDialogExcluirEtapaAberto(true);
  };

  const handleConfirmarRemocaoEtapa = async () => {
    if (!etapaParaExcluir) return;
    await handleRemoverEtapa(etapaParaExcluir.id);
    setDialogExcluirEtapaAberto(false);
    setEtapaParaExcluir(null);
  };

  const handleEtapaDragStart = (id: string) => (event: React.DragEvent) => {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setEtapaArrastandoId(id);
  };

  const handleEtapaDrop = (id: string) => async (event: React.DragEvent) => {
    event.preventDefault();
    const origem = event.dataTransfer.getData("text/plain") || etapaArrastandoId;
    if (!origem || origem === id) return;
    const copia = [...etapas];
    const origemIndex = copia.findIndex((etapa) => etapa.id === origem);
    const destinoIndex = copia.findIndex((etapa) => etapa.id === id);
    if (origemIndex < 0 || destinoIndex < 0) {
      return;
    }
    const [removida] = copia.splice(origemIndex, 1);
    copia.splice(destinoIndex, 0, removida);
    setEtapas(copia);

    const ok = await persistirOrdemEtapas(copia);
    if (ok) {
      await atualizarPipelines();
    }
    setEtapaArrastandoId(null);
    setEtapaEmHover(null);
  };

  const handleLimparFiltros = () => {
    setBusca("");
    setFiltroOwner("todos");
    setFiltroTag("todas");
    setFiltroOrigem("todas");
    setFiltroStatus("todos");
    setFiltroCanal("todos");
    setFiltroValor("todos");
    setFiltroProduto("todos");
    setFiltroMotivoPerda("todos");
    setFiltroEtapa("todas");
    setFiltroDataCampo("todas");
    setFiltroDataPeriodo("todas");
    setFiltroSomenteComEmpresa(false);
    setFiltroSomenteComTags(false);
  };

  const handleFiltroDataCampo = (valor: string) => {
    setFiltroDataCampo(valor);
    if (valor === "todas") {
      setFiltroDataPeriodo("todas");
    }
  };

  const classeItemFiltro =
    "pl-2 data-[state=checked]:pl-8 data-[state=checked]:text-primary data-[state=checked]:[&>span>svg]:text-primary";

  const exibirSkeletonDeals = carregando || carregandoDeals;

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Visualize negócios por etapa e acompanhe o ritmo do funil.
          </p>
        </div>
      </div>
      {erroDados && (
        <p className="text-xs text-destructive">{erroDados}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[220px] justify-between">
              <span className="text-blue-600 font-medium">
                {funisDisponiveis.find((f) => f.id === pipelineAtivoId)?.nome ?? "Selecione a pipeline"}
              </span>
              <ArrowDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[220px]">
            <DropdownMenuLabel>Pipelines</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {funisDisponiveis.map((funil) => (
              <DropdownMenuItem
                key={funil.id}
                className={cn(
                  "group flex items-center justify-between cursor-pointer",
                  funil.id === pipelineAtivoId && "bg-accent"
                )}
                onClick={() => handleSelecionarPipeline(funil.id)}
              >
                <span className={cn(
                  funil.id === pipelineAtivoId && "text-blue-600 font-medium"
                )}>
                  {funil.nome}
                </span>
                {funisDisponiveis.length > 1 && (
                  <button
                    onClick={(e) => handleAbrirExcluirPipeline(funil, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                    title="Excluir pipeline"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar negócios, empresa ou owner"
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtrar
              {filtroAtivoCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filtroAtivoCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {/* ... existing menu content ... */}
            <DropdownMenuLabel>Filtros do funil</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  <DropdownMenuCheckboxItem
                    checked={filtroStatus === "todos"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroStatus("todos");
                    }}
                    className={classeItemFiltro}
                  >
                    Todos os status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroStatus === "aberto"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroStatus("aberto");
                    }}
                    className={classeItemFiltro}
                  >
                    Em aberto
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroStatus === "ganho"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroStatus("ganho");
                    }}
                    className={classeItemFiltro}
                  >
                    Ganho
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroStatus === "perdido"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroStatus("perdido");
                    }}
                    className={classeItemFiltro}
                  >
                    Perdido
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroStatus === "pausado"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroStatus("pausado");
                    }}
                    className={classeItemFiltro}
                  >
                    Pausado
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Valor</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  <DropdownMenuCheckboxItem
                    checked={filtroValor === "todos"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroValor("todos");
                    }}
                    className={classeItemFiltro}
                  >
                    Todos os valores
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroValor === "ate-20"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroValor("ate-20");
                    }}
                    className={classeItemFiltro}
                  >
                    Até R$ 20k
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroValor === "20-50"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroValor("20-50");
                    }}
                    className={classeItemFiltro}
                  >
                    R$ 20k - 50k
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroValor === "50-100"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroValor("50-100");
                    }}
                    className={classeItemFiltro}
                  >
                    R$ 50k - 100k
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroValor === "acima-100"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroValor("acima-100");
                    }}
                    className={classeItemFiltro}
                  >
                    Acima de R$ 100k
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Atribuído</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  {owners.map((owner) => (
                    <DropdownMenuCheckboxItem
                      key={owner}
                      checked={filtroOwner === owner}
                      onCheckedChange={(valor) => {
                        if (!valor) return;
                        setFiltroOwner(owner);
                      }}
                      className={classeItemFiltro}
                    >
                      {owner === "todos" ? "Todos os owners" : owner}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Produto</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  {produtos.map((produto) => (
                    <DropdownMenuCheckboxItem
                      key={produto}
                      checked={filtroProduto === produto}
                      onCheckedChange={(valor) => {
                        if (!valor) return;
                        setFiltroProduto(produto);
                      }}
                      className={classeItemFiltro}
                    >
                      {produto === "todos" ? "Todos os produtos" : produto}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Tag</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  {tags.map((tag) => (
                    <DropdownMenuCheckboxItem
                      key={tag}
                      checked={filtroTag === tag}
                      onCheckedChange={(valor) => {
                        if (!valor) return;
                        setFiltroTag(tag);
                      }}
                      className={classeItemFiltro}
                    >
                      {tag === "todas" ? "Todas as tags" : tag}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Motivo da perda</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  {motivosPerda.map((motivo) => (
                    <DropdownMenuCheckboxItem
                      key={motivo}
                      checked={filtroMotivoPerda === motivo}
                      onCheckedChange={(valor) => {
                        if (!valor) return;
                        setFiltroMotivoPerda(motivo);
                      }}
                      className={classeItemFiltro}
                    >
                      {motivo === "todos" ? "Todos os motivos" : motivo}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Origem</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  {origens.map((origem) => (
                    <DropdownMenuCheckboxItem
                      key={origem}
                      checked={filtroOrigem === origem}
                      onCheckedChange={(valor) => {
                        if (!valor) return;
                        setFiltroOrigem(origem);
                      }}
                      className={classeItemFiltro}
                    >
                      {origem === "todas" ? "Todas as origens" : origem}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Etapa</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  {etapasFiltro.map((etapaId) => (
                    <DropdownMenuCheckboxItem
                      key={etapaId}
                      checked={filtroEtapa === etapaId}
                      onCheckedChange={(valor) => {
                        if (!valor) return;
                        setFiltroEtapa(etapaId);
                      }}
                      className={classeItemFiltro}
                    >
                      {etapaId === "todas"
                        ? "Todas as etapas"
                        : etapas.find((etapa) => etapa.id === etapaId)?.nome}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Canal</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  <DropdownMenuCheckboxItem
                    checked={filtroCanal === "todos"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroCanal("todos");
                    }}
                    className={classeItemFiltro}
                  >
                    Todos os canais
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroCanal === "whatsapp"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroCanal("whatsapp");
                    }}
                    className={classeItemFiltro}
                  >
                    WhatsApp
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroCanal === "instagram"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroCanal("instagram");
                    }}
                    className={classeItemFiltro}
                  >
                    Instagram
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Datas</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-60 max-h-72 overflow-y-auto">
                  <DropdownMenuLabel>Campo</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={filtroDataCampo === "todas"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      handleFiltroDataCampo("todas");
                    }}
                    className={classeItemFiltro}
                  >
                    Todos os campos
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroDataCampo === "criado-em"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      handleFiltroDataCampo("criado-em");
                    }}
                    className={classeItemFiltro}
                  >
                    Criado em
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroDataCampo === "ganho-perdido-em"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      handleFiltroDataCampo("ganho-perdido-em");
                    }}
                    className={classeItemFiltro}
                  >
                    Ganho/Perdido em
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroDataCampo === "previsao-fechamento"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      handleFiltroDataCampo("previsao-fechamento");
                    }}
                    className={classeItemFiltro}
                  >
                    Previsão de fechamento
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroDataCampo === "ultima-mudanca"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      handleFiltroDataCampo("ultima-mudanca");
                    }}
                    className={classeItemFiltro}
                  >
                    Última mudança da etapa
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroDataCampo === "campo-customizado"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      handleFiltroDataCampo("campo-customizado");
                    }}
                    className={classeItemFiltro}
                  >
                    Campos customizados
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Período</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={filtroDataPeriodo === "todas"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroDataPeriodo("todas");
                    }}
                    className={classeItemFiltro}
                  >
                    Qualquer data
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroDataPeriodo === "7d"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroDataPeriodo("7d");
                    }}
                    className={classeItemFiltro}
                  >
                    Últimos 7 dias
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroDataPeriodo === "30d"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroDataPeriodo("30d");
                    }}
                    className={classeItemFiltro}
                  >
                    Últimos 30 dias
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroDataPeriodo === "90d"}
                    onCheckedChange={(valor) => {
                      if (!valor) return;
                      setFiltroDataPeriodo("90d");
                    }}
                    className={classeItemFiltro}
                  >
                    Últimos 90 dias
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Outros</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  <DropdownMenuCheckboxItem
                    checked={filtroSomenteComEmpresa}
                    onCheckedChange={(valor) =>
                      setFiltroSomenteComEmpresa(Boolean(valor))
                    }
                    className={classeItemFiltro}
                  >
                    Somente com empresa
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroSomenteComTags}
                    onCheckedChange={(valor) =>
                      setFiltroSomenteComTags(Boolean(valor))
                    }
                    className={classeItemFiltro}
                  >
                    Somente com tags
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLimparFiltros}>
              Limpar filtros
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={() => setDialogCriarNegocioAberto(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar negócio
        </Button>
        <Button variant="outline" onClick={handleAbrirNovoFunil} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova pipeline
        </Button>
        <Button variant="outline" onClick={() => setDialogEtapasAberto(true)}>
          Editar etapas
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-card/40 p-3">
        <div className="flex items-center gap-3">
          <Switch
            id="modo-selecao"
            checked={modoSelecao}
            onCheckedChange={setModoSelecao}
          />
          <label htmlFor="modo-selecao" className="text-sm">
            Seleção múltipla
          </label>
        </div>
        {selecionados.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {selecionados.length} selecionados
            </Badge>
            <Select onValueChange={handleAplicarTag}>
              <SelectTrigger className="w-[170px] shadow-none">
                <SelectValue placeholder="Aplicar tag" />
              </SelectTrigger>
              <SelectContent>
                {tagsDisponiveis
                  .map((tag) => (
                    <SelectItem key={tag.id} value={tag.nome}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.cor ?? "#94a3b8" }} />
                        {tag.nome}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleAplicarOwner}>
              <SelectTrigger className="w-[170px] shadow-none">
                <SelectValue placeholder="Alterar owner" />
              </SelectTrigger>
              <SelectContent>
                {owners
                  .filter((owner) => owner !== "todos")
                  .map((owner) => (
                    <SelectItem key={owner} value={owner}>
                      {owner}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => {
              setFunilDestino(pipelineAtivoId);
              setEtapaDestino(etapas[0]?.id || "");
              setDialogMoverSelecionadosAberto(true);
            }}>
              Mover
            </Button>
            <Button variant="destructive" onClick={() => setDialogExcluirAberto(true)}>
              Excluir
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Selecione negócios para aplicar tags, owner ou exclusão.
          </p>
        )}
      </div>

      <div className="w-full max-w-full overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {exibirSkeletonDeals
            ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className={cn(
                  "flex h-[calc(100vh-360px)] min-h-[540px] w-[280px] flex-col rounded-[6px] border border-border/60 bg-card/40",
                  "sm:w-[300px]"
                )}
              >
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-6 w-10" />
                </div>
                <div className="flex-1 space-y-3 px-3 py-3">
                  {Array.from({ length: 3 }).map((_, cardIndex) => (
                    <Skeleton key={`skeleton-card-${cardIndex}`} className="h-24 w-full" />
                  ))}
                </div>
              </div>
            ))
            : etapas.map((etapa) => {
              const dealsDaEtapa = dealsPorEtapa[etapa.id] ?? [];
              const limite = limites[etapa.id] ?? LIMITE_INICIAL;
              const visiveis = dealsDaEtapa.slice(0, limite);
              const textoEtapa = classeTextoEtapa(etapa.cor);
              const textoEscuro = textoEtapa === "text-slate-900";

              return (
                <div
                  key={etapa.id}
                  className={cn(
                    "flex h-[calc(100vh-360px)] min-h-[540px] w-[280px] flex-col rounded-[6px] border border-border/60 bg-card/40",
                    "sm:w-[300px]",
                    colunaEmHover === etapa.id && "border-primary/40 bg-primary/5"
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setColunaEmHover(etapa.id);
                  }}
                  onDragLeave={() => setColunaEmHover(null)}
                  onDrop={handleDrop(etapa.id)}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-t-[6px] border-b px-3 py-3",
                      textoEtapa,
                      textoEscuro ? "border-black/15" : "border-white/20"
                    )}
                    style={{
                      backgroundColor: etapa.cor ?? "hsl(var(--primary))",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          textoEscuro ? "bg-slate-900/70" : "bg-white/80"
                        )}
                      />
                      <p className="text-sm font-semibold">{etapa.nome}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "border border-transparent",
                        textoEscuro
                          ? "bg-white/70 text-slate-900"
                          : "bg-white/20 text-white"
                      )}
                    >
                      {dealsDaEtapa.length}
                    </Badge>
                  </div>
                  <div
                    className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
                    onScroll={handleScrollColuna(etapa.id)}
                  >
                    {visiveis.length === 0 ? (
                      <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                        Nenhum negócio nesta etapa.
                      </div>
                    ) : (
                      visiveis.map((deal) => (
                        <Card
                          key={deal.id}
                          role="button"
                          tabIndex={0}
                          draggable={!modoSelecao}
                          onDragStart={handleDragStart(deal.id)}
                          onDragEnd={() => setArrastandoId(null)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleAbrirDeal(deal);
                            }
                          }}
                          onClick={() => handleAbrirDeal(deal)}
                          className={cn(
                            "cursor-pointer border border-border/60 bg-background/80 transition hover:border-primary/40 hover:bg-primary/5 py-0 gap-0 justify-start",
                            arrastandoId === deal.id && "opacity-60",
                            selecionados.includes(deal.id) && "border-primary/60"
                          )}
                        >
                          <CardContent className="space-y-3 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage
                                    src={
                                      deal.avatarUrl ?? "/avatars/contato-placeholder.svg"
                                    }
                                    alt={deal.nome}
                                  />
                                  <AvatarFallback>
                                    {iniciaisDeal(deal.nome)}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-sm font-semibold">{deal.nome}</p>
                              </div>
                              {modoSelecao && (
                                <Checkbox
                                  checked={selecionados.includes(deal.id)}
                                  onCheckedChange={() =>
                                    handleToggleSelecionado(deal.id)
                                  }
                                  onClick={(event) => event.stopPropagation()}
                                />
                              )}
                            </div>
                            <div className="space-y-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5" />
                                <span>{deal.owner}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="h-3.5 w-3.5" />
                                <span>
                                  {podeVerValores
                                    ? formatarMoeda(deal.valor, deal.moeda)
                                    : "Valor restrito"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-3.5 w-3.5" />
                                <span>{formatarDataCurta(deal.criadoEm)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {deal.tags.length === 0 ? (
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleAbrirTagRapida(deal.id);
                                    }}
                                    aria-label="Adicionar tag"
                                  >
                                    <Tag className="h-3.5 w-3.5" />
                                  </Button>
                                ) : (
                                  <>
                                    <Tag className="h-3.5 w-3.5" />
                                    <div className="flex flex-wrap gap-1">
                                      {deal.tags.map((tag) => (
                                        <Badge
                                          key={tag}
                                          className="text-[10px] text-white"
                                          style={{
                                            backgroundColor:
                                              coresTags[tag] ?? "#94a3b8",
                                          }}
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              {tagRapidaId === deal.id && (
                                <div
                                  className="flex items-center gap-2"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <Input
                                    value={tagRapidaValor}
                                    onChange={(event) =>
                                      setTagRapidaValor(event.target.value)
                                    }
                                    placeholder="Adicionar tag"
                                    className="h-8 text-xs"
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        void handleSalvarTagRapida(deal.id);
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="secondary"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleSalvarTagRapida(deal.id);
                                    }}
                                    aria-label="Salvar tag"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                    {limite < dealsDaEtapa.length && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() =>
                          setLimites((atual) => ({
                            ...atual,
                            [etapa.id]:
                              (atual[etapa.id] ?? LIMITE_INICIAL) + LIMITE_INICIAL,
                          }))
                        }
                      >
                        Carregar mais
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <Dialog open={dialogExcluirAberto} onOpenChange={setDialogExcluirAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir negócios selecionados?</DialogTitle>
            <DialogDescription>
              Esta ação remove os negócios do funil. Não é possível desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogExcluirAberto(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluirSelecionados}>
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogNovoFunilAberto}
        onOpenChange={setDialogNovoFunilAberto}
      >
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Adicionar nova pipeline</DialogTitle>
            <DialogDescription>
              Defina as informações e etapas para criar um novo funil.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh] pr-2">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="novo-funil-nome" className="text-sm font-medium">
                  Nome da pipeline
                </label>
                <Input
                  id="novo-funil-nome"
                  value={formNovoFunil.nome}
                  onChange={(event) =>
                    setFormNovoFunil((atual) => ({
                      ...atual,
                      nome: event.target.value,
                    }))
                  }
                  placeholder="Ex: Pipeline Enterprise"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="novo-funil-descricao" className="text-sm font-medium">
                  Descrição
                </label>
                <Textarea
                  id="novo-funil-descricao"
                  value={formNovoFunil.descricao}
                  onChange={(event) =>
                    setFormNovoFunil((atual) => ({
                      ...atual,
                      descricao: event.target.value,
                    }))
                  }
                  placeholder="Explique o objetivo desta pipeline."
                  className="min-h-[90px]"
                />
              </div>
              <Separator />
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Etapas da pipeline</p>
                  <span className="text-xs text-muted-foreground">
                    {etapasNovoFunil.length} etapas
                  </span>
                </div>
                <div className="grid gap-2">
                  {etapasNovoFunil.map((etapa) => (
                    <div
                      key={etapa.id}
                      className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border/60 bg-muted/30 p-3"
                    >
                      <Input
                        value={etapa.nome}
                        onChange={(event) =>
                          handleAtualizarEtapaNovoFunil(etapa.id, {
                            nome: event.target.value,
                          })
                        }
                        className="min-w-[220px]"
                        placeholder="Nome da etapa"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Cor</span>
                        <input
                          type="color"
                          value={etapa.cor ?? "#94a3b8"}
                          onChange={(event) =>
                            handleAtualizarEtapaNovoFunil(etapa.id, {
                              cor: event.target.value,
                            })
                          }
                          className="h-8 w-8 cursor-pointer rounded-[6px] border border-border/60 bg-transparent p-0"
                          aria-label={`Selecionar cor para ${etapa.nome}`}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoverEtapaNovoFunil(etapa.id)}
                        aria-label={`Remover etapa ${etapa.nome}`}
                        disabled={etapasNovoFunil.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={novaEtapaNovoFunil.nome}
                    onChange={(event) =>
                      setNovaEtapaNovoFunil((atual) => ({
                        ...atual,
                        nome: event.target.value,
                      }))
                    }
                    placeholder="Nome da nova etapa"
                    className="min-w-[220px]"
                  />
                  <input
                    type="color"
                    value={novaEtapaNovoFunil.cor}
                    onChange={(event) =>
                      setNovaEtapaNovoFunil((atual) => ({
                        ...atual,
                        cor: event.target.value,
                      }))
                    }
                    className="h-8 w-8 cursor-pointer rounded-[6px] border border-border/60 bg-transparent p-0"
                    aria-label="Selecionar cor da nova etapa"
                  />
                  <Button onClick={handleAdicionarEtapaNovoFunil} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar etapa
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogNovoFunilAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarNovoFunil}
              disabled={
                !formNovoFunil.nome.trim() || etapasNovoFunil.length === 0
              }
            >
              Criar funil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogEtapasAberto} onOpenChange={setDialogEtapasAberto}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Editar etapas do funil</DialogTitle>
            <DialogDescription>
              Renomeie, reordene ou adicione novas etapas.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] pr-2">
            <div className="space-y-3">
              {etapas.map((etapa) => (
                <div
                  key={etapa.id}
                  draggable
                  onDragStart={handleEtapaDragStart(etapa.id)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setEtapaEmHover(etapa.id);
                  }}
                  onDragLeave={() => setEtapaEmHover(null)}
                  onDragEnd={() => {
                    setEtapaArrastandoId(null);
                    setEtapaEmHover(null);
                  }}
                  onDrop={handleEtapaDrop(etapa.id)}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-[6px] border border-border/60 bg-muted/30 p-3 transition",
                    "cursor-grab active:cursor-grabbing",
                    etapaEmHover === etapa.id && "border-primary/50 bg-primary/5",
                    etapaArrastandoId === etapa.id && "opacity-60"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={etapa.nome}
                    onChange={(event) =>
                      handleRenomearEtapa(etapa.id, event.target.value)
                    }
                    onBlur={() => handleSalvarRenomearEtapa(etapa.id, etapa.nome)}
                    className="min-w-[220px]"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Cor</span>
                    <input
                      type="color"
                      value={etapa.cor ?? "#94a3b8"}
                      onChange={(event) =>
                        handleAtualizarCorEtapa(etapa.id, event.target.value)
                      }
                      className="h-8 w-8 cursor-pointer rounded-[6px] border border-border/60 bg-transparent p-0"
                      aria-label={`Selecionar cor para ${etapa.nome}`}
                    />
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoverEtapa(etapa.id, "up")}
                      aria-label="Mover etapa para cima"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoverEtapa(etapa.id, "down")}
                      aria-label="Mover etapa para baixo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSolicitarRemocaoEtapa(etapa)}
                      aria-label="Remover etapa"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Separator />
          <div className="flex items-center gap-2">
            <Input
              value={novaEtapa}
              onChange={(event) => setNovaEtapa(event.target.value)}
              placeholder="Nome da nova etapa"
            />
            <Button onClick={handleAdicionarEtapa} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogExcluirEtapaAberto}
        onOpenChange={(aberto) => {
          setDialogExcluirEtapaAberto(aberto);
          if (!aberto) {
            setEtapaParaExcluir(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Excluir etapa {etapaParaExcluir ? `"${etapaParaExcluir.nome}"` : ""}?
            </DialogTitle>
            <DialogDescription>
              Os negócios desta etapa serão movidos para a próxima etapa disponível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogExcluirEtapaAberto(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmarRemocaoEtapa}>
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogExcluirPipelineAberto}
        onOpenChange={(aberto) => {
          setDialogExcluirPipelineAberto(aberto);
          if (!aberto) {
            setPipelineParaExcluir(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Excluir pipeline {pipelineParaExcluir ? `"${pipelineParaExcluir.nome}"` : ""}?
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os contatos e negócios vinculados a esta pipeline serão excluídos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogExcluirPipelineAberto(false)}
              disabled={excluindoPipeline}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleExcluirPipeline}
              disabled={excluindoPipeline}
            >
              {excluindoPipeline ? "Excluindo..." : "Confirmar exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMoverSelecionadosAberto}
        onOpenChange={setDialogMoverSelecionadosAberto}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover {selecionados.length} negócios selecionados</DialogTitle>
            <DialogDescription>
              Escolha o funil e a etapa de destino.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Funil de destino</label>
              <Select
                value={funilDestino}
                onValueChange={(valor) => {
                  setFunilDestino(valor);
                  const funil = funisDisponiveis.find((f) => f.id === valor);
                  const targetStages = funil?.etapas || [];
                  setEtapaDestino(targetStages[0]?.id || "");
                }}
              >
                <SelectTrigger className="shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {funisDisponiveis.map((funil) => (
                    <SelectItem key={funil.id} value={funil.id}>
                      {funil.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Etapa de destino</label>
              <Select value={etapaDestino} onValueChange={setEtapaDestino}>
                <SelectTrigger className="shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(funisDisponiveis.find(f => f.id === funilDestino)?.etapas || []).map((etapa) => (
                    <SelectItem key={etapa.id} value={etapa.id}>
                      {etapa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogMoverSelecionadosAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarMoverSelecionados}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(dealAtivo)}
        onOpenChange={(aberto) => {
          if (!aberto) setDealAtivo(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col gap-0 border-l bg-white dark:bg-slate-950 shadow-none">
          {dealAtivo && (
            <>
              {/* HEADER: Modern, Clean, High Hierarchy */}
              <div className="flex-none px-6 py-5 border-b border-border/60 bg-white dark:bg-slate-950 z-10">
                <SheetHeader className="sr-only">
                  <SheetTitle>{dealAtivo.nome}</SheetTitle>
                </SheetHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 line-clamp-1">
                      {dealAtivo.nome}
                    </h2>
                    {dealAtivo.empresa && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{dealAtivo.empresa}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Valor Estimado</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                      {podeVerValores
                        ? formatarMoeda(dealAtivo.valor, dealAtivo.moeda)
                        : "R$ ---"}
                    </p>
                  </div>
                </div>

                {/* Toolbar: Iconic & Minimal - NO SHADOWS */}
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex-1 flex gap-2">
                    <Link href="/app/inbox" className="h-8">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-none rounded-[6px]">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Conversa
                      </Button>
                    </Link>
                    <Button onClick={handleAbrirEditarDeal} variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-none rounded-[6px]">
                      <PencilLine className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      Editar
                    </Button>
                    <Button onClick={() => setDialogMoverDealAberto(true)} variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-none rounded-[6px]">
                      <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      Mover
                    </Button>
                  </div>

                  <Button onClick={() => setDialogExcluirDealAberto(true)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 rounded-[6px] shadow-none">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* BODY: Content - Native Scroll for reliability */}
              <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 min-h-0">
                <div className="flex flex-col min-h-full">
                  <Tabs defaultValue="visao-geral" className="flex-1 flex flex-col">
                    <div className="px-6 border-b border-border/60 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
                      <TabsList className="w-full justify-start h-11 p-0 bg-transparent gap-8 border-none shadow-none text-muted-foreground">
                        <TabsTrigger value="visao-geral" className="rounded-none border-none px-0 h-11 data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-sm text-muted-foreground hover:text-foreground transition-colors shadow-none bg-transparent">
                          Visão Geral
                        </TabsTrigger>
                        <TabsTrigger value="atividades" className="rounded-none border-none px-0 h-11 data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-sm text-muted-foreground hover:text-foreground transition-colors shadow-none bg-transparent">
                          Atividades
                        </TabsTrigger>
                        <TabsTrigger value="arquivos" className="rounded-none border-none px-0 h-11 data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-sm text-muted-foreground hover:text-foreground transition-colors shadow-none bg-transparent">
                          Arquivos <span className="ml-1.5 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-600 dark:text-slate-400">{arquivosDeal.length}</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* TAB: OVERVIEW */}
                    <TabsContent value="visao-geral" className="p-6 m-0 space-y-8">

                      {/* Properties Grid: Linear Style */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            Etapa Atual
                          </label>
                          <Select value={dealAtivo.etapaId} onValueChange={() => setDialogMoverDealAberto(true)}>
                            <SelectTrigger className="h-9 w-full bg-slate-50 dark:bg-slate-900 border-border/60 focus:ring-1 focus:ring-primary/20 shadow-none rounded-[6px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="shadow-none border-border/60 rounded-[6px]">
                              {etapas.map((etapa) => (
                                <SelectItem key={etapa.id} value={etapa.id}>{etapa.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            Responsável
                          </label>
                          <Select value={dealAtivo.owner} disabled>
                            <SelectTrigger className="h-9 w-full bg-slate-50 dark:bg-slate-900 border-border/60 focus:ring-1 focus:ring-primary/20 shadow-none rounded-[6px]">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 border border-slate-200">
                                  <AvatarFallback className="text-[9px] bg-slate-100 text-slate-600">{iniciaisDeal(dealAtivo.owner)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate">{dealAtivo.owner}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="shadow-none border-border/60 rounded-[6px]">
                              <SelectItem value={dealAtivo.owner}>{dealAtivo.owner}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator className="bg-border/60" />

                      {/* Contact Section: Clean List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            Contato Principal
                          </h3>
                        </div>

                        <div
                          onClick={() => {
                            router.push(`/app/contatos?id=${dealAtivo.id}`);
                          }}
                          className="flex items-start gap-4 p-3 border border-border/60 bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group rounded-[6px] shadow-none"
                        >
                          <Avatar className="h-10 w-10 border border-slate-100 dark:border-slate-800">
                            <AvatarImage src={dealAtivo.avatarUrl ?? ""} />
                            <AvatarFallback className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 font-medium">{iniciaisDeal(dealAtivo.nome)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-sm text-foreground group-hover:text-blue-600 transition-colors">{dealAtivo.nome}</p>
                              <Badge variant="secondary" className="text-[10px] h-5 font-normal text-muted-foreground bg-slate-100 dark:bg-slate-800 shadow-none rounded-[6px]">
                                Principal
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 truncate">Responsável pelo negócio</p>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 p-1 px-2 bg-slate-50 dark:bg-slate-800/50 rounded-[6px]">
                                <Phone className="w-3 h-3" /> {dealAtivo.telefone ? formatarTelefone(dealAtivo.telefone) : '---'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="bg-border/60" />

                      {/* Tags: Integrated UI */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                          Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {dealAtivo.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-white pl-2.5 pr-1.5 py-1 text-xs font-medium border-transparent transition-colors flex items-center gap-1.5 shadow-none rounded-[6px]" style={{
                              backgroundColor: coresTags[tag] ?? "#94a3b8",
                              borderColor: (coresTags[tag] ?? "#94a3b8") + '30'
                            }}>
                              {tag}
                              <button onClick={() => void handleRemoverTagDeal(tag)} className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-white/80 hover:text-white">
                                <XCircle className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}

                          <div className="flex items-center gap-2">
                            <Input
                              value={novaTagDeal}
                              onChange={(event) => setNovaTagDeal(event.target.value)}
                              placeholder="Nova tag"
                              className="h-7 text-xs w-[120px] rounded-[6px]"
                            />
                            <Button onClick={() => void handleAdicionarTagDeal()} variant="outline" size="sm" className="h-7 text-xs border-dashed gap-1.5 px-3 text-muted-foreground hover:text-foreground hover:border-slate-300 shadow-none rounded-[6px]">
                              <Plus className="w-3.5 h-3.5" /> Adicionar
                            </Button>
                          </div>
                        </div>

                        {tagsDisponiveisDeal.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 rounded-[6px] border border-border/60 bg-muted/30 p-2">
                            {tagsDisponiveisDeal.map((tag) => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => void aplicarTagAoDeal(dealAtivo.id, tag.nome)}
                                className="rounded-[6px] px-2 py-1 text-xs text-white"
                                style={{ backgroundColor: tag.cor ?? "#94a3b8" }}
                              >
                                {tag.nome}
                              </button>
                            ))}
                          </div>
                        )}

                      </div>

                      <Separator className="bg-border/60" />

                      {/* Notes */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                          Resumo / Nota
                        </h3>
                        <div className="relative">
                          <Textarea
                            value={notaAtual}
                            onChange={(event) => setNotaAtual(event.target.value)}
                            className="min-h-[120px] text-sm bg-slate-50/50 dark:bg-slate-900 border-border/60 resize-none font-normal focus:bg-white dark:focus:bg-slate-950 transition-colors leading-relaxed p-4 shadow-none rounded-[6px]"
                            placeholder="Escreva uma nota..."
                          />
                          <div className="absolute bottom-2 right-2">
                            <Button
                              size="sm"
                              onClick={() => handleSalvarNota(true)}
                              disabled={!notaAtual.trim() || enviandoNota}
                              className="h-7 text-xs shadow-none border border-transparent rounded-[6px]"
                            >
                              {enviandoNota ? "Salvando..." : "Salvar"}
                            </Button>
                          </div>
                        </div>

                        {/* Note List - Buttons */}
                        {notasDeal.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Notas Anteriores</h4>
                            <div className="flex flex-wrap gap-2">
                              {notasDeal.map((nota) => (
                                <Button
                                  key={nota.id}
                                  variant="outline"
                                  onClick={() => setNotaVisualizada(nota)}
                                  className="h-8 max-w-full justify-start text-xs font-normal shadow-none border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[6px]"
                                  title={nota.conteudo}
                                >
                                  <MessageSquare className="w-3 h-3 mr-2 text-slate-400 flex-shrink-0" />
                                  <span className="truncate max-w-[200px]">
                                    {nota.conteudo.length > 30 ? nota.conteudo.slice(0, 30) + "..." : nota.conteudo}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* TAB: ACTIVITY (Consolidated) */}
                    <TabsContent value="atividades" className="p-0 m-0">
                      <ScrollArea className="h-[500px] p-6">
                        <div className="space-y-8">
                          {carregandoTimeline ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                              Carregando atividades...
                            </div>
                          ) : timelineDeal.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                              Nenhuma atividade registrada ainda.
                            </div>
                          ) : (
                            timelineDeal.map((item, i) => (
                              <div key={item.id} className="flex gap-4 group">
                                <div className="flex flex-col items-center relative">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white z-10 border-2 border-white dark:border-slate-950 shadow-none ${item.tipo_item === 'tarefa' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                                    <History className="w-3.5 h-3.5" />
                                  </div>
                                  {i !== timelineDeal.length - 1 && (
                                    <div className="absolute top-8 bottom-[-32px] w-[2px] bg-slate-100 dark:bg-slate-800" />
                                  )}
                                </div>
                                <div className="flex-1 pb-2">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-sm font-semibold capitalize text-slate-900 dark:text-slate-100">{item.titulo}</span>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">{formatarDataHora(item.data)}</span>
                                  </div>
                                  {item.descricao && (
                                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                      {item.descricao}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <Avatar className="w-4 h-4">
                                      <AvatarFallback className="text-[8px] bg-slate-200">
                                        {item.autor_id === session?.user.id ? "VC" : "EQ"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground font-medium">
                                      {item.autor_id === session?.user.id ? "Você" : "Equipe"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    {/* TAB: FILES */}
                    <TabsContent value="arquivos" className="p-6 m-0">

                      {carregandoDetalhesDeal ? (
                        <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                          Carregando arquivos...
                        </div>
                      ) : arquivosDeal.length === 0 ? (
                        <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer group rounded-[6px] shadow-none" onClick={() => arquivoDealInputRef.current?.click()}>
                          <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 text-slate-500 border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform shadow-none">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Clique para fazer upload</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, JPG ou PNG (max 10MB)</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer group rounded-[6px] shadow-none mb-4" onClick={() => arquivoDealInputRef.current?.click()}>
                            <p className="text-xs font-medium text-foreground flex items-center gap-2"><Plus className="w-3 h-3" /> Adicionar novo arquivo</p>
                          </div>
                          {arquivosDeal.map((arquivo) => (
                            <div
                              key={arquivo.id}
                              className="flex items-center justify-between rounded-[6px] border border-border/60 bg-background/80 p-3 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium" title={arquivo.file_name}>
                                    {(() => {
                                      // 1. Remove UUID prefix (typical pattern: 8-4-4-4-12 chars + dash)
                                      // Regex looks for UUID at start of string followed by a dash
                                      const cleanName = arquivo.file_name.replace(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-/, "");

                                      // 2. Truncate logic
                                      // If name is short enough, return as is
                                      if (cleanName.length < 30) return cleanName;

                                      // Split by common separators to find "words"
                                      const parts = cleanName.split(/[\s-_.]+/);
                                      const extension = cleanName.split('.').pop();

                                      // If we have at least 3 parts, try to combine first 3
                                      if (parts.length >= 3) {
                                        // Take first 3 'words'
                                        const prefix = parts.slice(0, 3).join(" ");
                                        return `${prefix}...${extension ? `.${extension}` : ""}`;
                                      }

                                      // Fallback for long strings without separators: take first 20 chars
                                      return `${cleanName.substring(0, 20)}...${extension ? `.${extension}` : ""}`;
                                    })()}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatarBytes(arquivo.tamanho_bytes ?? undefined)} ·{" "}
                                    {formatarDataHora(arquivo.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {arquivo.publicUrl && (
                                  <Button size="sm" variant="link" asChild>
                                    <a
                                      href={arquivo.publicUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Abrir
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleExcluirArquivoDeal(arquivo)}
                                  disabled={arquivoExcluindoId === arquivo.id}
                                  aria-label="Excluir arquivo"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <input
                        ref={arquivoDealInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleSelecionarArquivoDeal}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* FOOTER: Sticky Decision Bar */}
              <SheetFooter className="flex-none p-4 border-t border-border bg-white dark:bg-slate-950 w-full sm:justify-between z-20 shadow-none">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                  <History className="w-3.5 h-3.5" />
                  <span>Criado em {formatarDataHora(dealAtivo.criadoEm)}</span>
                </div>

                <div className="flex w-full sm:w-auto gap-3">
                  <Button onClick={handleAbrirPerda} variant="outline" className="flex-1 sm:flex-none h-10 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 transition-all shadow-none rounded-[6px]">
                    <XCircle className="w-4 h-4 mr-2" />
                    Marcar Perdido
                  </Button>
                  <Button onClick={handleAbrirGanho} className="flex-1 sm:flex-none h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-none hover:shadow-none transition-all rounded-[6px]">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marcar Ganho
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={dialogEditarDealAberto}
        onOpenChange={setDialogEditarDealAberto}
      >
        <DialogContent className="shadow-none [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>Editar negócio</DialogTitle>
            <DialogDescription>
              Atualize as informações principais do negócio selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label htmlFor="editar-deal-nome" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="editar-deal-nome"
                value={formEditarDeal.nome}
                onChange={(event) =>
                  setFormEditarDeal((atual) => ({
                    ...atual,
                    nome: event.target.value,
                  }))
                }
                placeholder="Nome do negócio"
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="editar-deal-empresa"
                className="text-sm font-medium"
              >
                Empresa
              </label>
              <Input
                id="editar-deal-empresa"
                value={formEditarDeal.empresa}
                onChange={(event) =>
                  setFormEditarDeal((atual) => ({
                    ...atual,
                    empresa: event.target.value,
                  }))
                }
                placeholder="Empresa vinculada"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="editar-deal-valor" className="text-sm font-medium">
                Valor
              </label>
              <Input
                id="editar-deal-valor"
                type="number"
                value={formEditarDeal.valor}
                onChange={(event) =>
                  setFormEditarDeal((atual) => ({
                    ...atual,
                    valor: event.target.value,
                  }))
                }
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Moeda</label>
              <Select
                value={formEditarDeal.moeda}
                onValueChange={(moeda) =>
                  setFormEditarDeal((atual) => ({ ...atual, moeda }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a moeda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Owner</label>
              <Select
                value={formEditarDeal.owner}
                onValueChange={(owner) =>
                  setFormEditarDeal((atual) => ({ ...atual, owner }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {owners
                    .filter((owner) => owner !== "todos")
                    .map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="editar-deal-produto" className="text-sm font-medium">
                Produto
              </label>
              <Select
                value={formEditarDeal.produto}
                onValueChange={(value) =>
                  setFormEditarDeal((atual) => ({
                    ...atual,
                    produto: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtosDisponiveis.map((prod) => (
                    <SelectItem key={prod.id} value={prod.nome}>
                      {prod.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogEditarDealAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarEditarDeal}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogNotaAberto} onOpenChange={setDialogNotaAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar nota</DialogTitle>
            <DialogDescription>
              Registre um insight ou informação importante sobre o negócio.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notaAtual}
            onChange={(event) => setNotaAtual(event.target.value)}
            placeholder="Escreva a nota para este negócio"
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogNotaAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleSalvarNota(true)}
              disabled={!notaAtual.trim() || enviandoNota}
            >
              {enviandoNota ? "Salvando..." : "Salvar nota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!notaVisualizada} onOpenChange={(open) => !open && setNotaVisualizada(null)}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-lg rounded-[6px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Nota de {notaVisualizada?.autor_id === session?.user.id ? 'Você' : 'Equipe'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registrada em {notaVisualizada && formatarDataHora(notaVisualizada.created_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[6px] text-sm leading-relaxed whitespace-pre-wrap border border-border/50 text-slate-700 dark:text-slate-300 min-h-[100px]">
            {notaVisualizada?.conteudo}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between w-full">
            {notaVisualizada?.autor_id === session?.user.id ? (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!notaVisualizada || !dealAtivo || !workspaceId) return;

                  // Delete from DB
                  const { error } = await supabaseClient
                    .from("contact_notes")
                    .delete()
                    .eq("id", notaVisualizada.id)
                    .eq("workspace_id", workspaceId);

                  if (error) {
                    console.error("Erro ao excluir nota:", error);
                    return;
                  }

                  // Update State
                  setNotasDeal(atual => atual.filter(n => n.id !== notaVisualizada.id));
                  setNotaVisualizada(null);

                  // Log Activity
                  await registrarAtividade(dealAtivo.id, "nota_removida", { resumo: notaVisualizada.conteudo.substring(0, 50) });
                }}
                className="shadow-none rounded-[6px] gap-2 px-3"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            ) : <div />}
            <Button variant="outline" onClick={() => setNotaVisualizada(null)} className="shadow-none rounded-[6px]">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogAtividadeAberto}
        onOpenChange={setDialogAtividadeAberto}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar atividade</DialogTitle>
            <DialogDescription>
              Planeje um próximo passo com o cliente ou equipe.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label
                htmlFor="atividade-titulo"
                className="text-sm font-medium"
              >
                Atividade
              </label>
              <Input
                id="atividade-titulo"
                value={atividadeAtual.titulo}
                onChange={(event) =>
                  setAtividadeAtual((atual) => ({
                    ...atual,
                    titulo: event.target.value,
                  }))
                }
                placeholder="Ex: Reunião de alinhamento"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="atividade-data" className="text-sm font-medium">
                Data
              </label>
              <Input
                id="atividade-data"
                type="date"
                value={atividadeAtual.data}
                onChange={(event) =>
                  setAtividadeAtual((atual) => ({
                    ...atual,
                    data: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="atividade-hora" className="text-sm font-medium">
                Hora
              </label>
              <Input
                id="atividade-hora"
                type="time"
                value={atividadeAtual.hora}
                onChange={(event) =>
                  setAtividadeAtual((atual) => ({
                    ...atual,
                    hora: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Responsável</label>
              <Select
                value={atividadeAtual.responsavel}
                onValueChange={(responsavel) =>
                  setAtividadeAtual((atual) => ({ ...atual, responsavel }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {owners
                    .filter((owner) => owner !== "todos")
                    .map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogAtividadeAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarAtividade}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMoverDealAberto}
        onOpenChange={setDialogMoverDealAberto}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mover negócio</DialogTitle>
            <DialogDescription>
              Escolha o funil e a etapa de destino para este negócio.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Funil</label>
              <Select
                value={funilDestino}
                onValueChange={(valor) => {
                  setFunilDestino(valor);
                  if (!etapaDestino && etapas[0]?.id) {
                    setEtapaDestino(etapas[0].id);
                  }
                }}
              >
                <SelectTrigger className="w-full shadow-none">
                  <SelectValue placeholder="Selecione o funil" />
                </SelectTrigger>
                <SelectContent>
                  {funisDisponiveis.map((funil) => (
                    <SelectItem key={funil.id} value={funil.id}>
                      {funil.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Etapa</label>
              <Select
                value={etapaDestino || etapas[0]?.id}
                onValueChange={setEtapaDestino}
              >
                <SelectTrigger className="w-full shadow-none">
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {etapas.map((etapa) => (
                    <SelectItem key={etapa.id} value={etapa.id}>
                      {etapa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-3 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setDialogMoverDealAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarMoverDeal}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogExcluirArquivoAberto}
        onOpenChange={setDialogExcluirArquivoAberto}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão de arquivo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o arquivo "{arquivoExcluindo?.file_name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setDialogExcluirArquivoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarExclusaoArquivo}
            >
              {arquivoExcluindoId === arquivoExcluindo?.id ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCriarNegocioAberto} onOpenChange={setDialogCriarNegocioAberto}>
        <DialogContent className="sm:max-w-[700px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Novo Negócio</DialogTitle>
            <DialogDescription>Preencha os dados abaixo para criar um novo negócio.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh] p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vincular contato (Opcional)</label>
              <Popover open={comboboxContatoAberto} onOpenChange={setComboboxContatoAberto}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxContatoAberto}
                    className="w-full justify-between shadow-none"
                  >
                    {novoNegocio.contatoId
                      ? contatosDisponiveis.find((c) => c.id === novoNegocio.contatoId)?.nome
                      : "Buscar contato..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 z-[9999]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Buscar contato..." value={buscaContato} onValueChange={setBuscaContato} />
                    <CommandList>
                      <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                      <CommandGroup>
                        {contatosDisponiveis.filter(c => c.nome.toLowerCase().includes(buscaContato.toLowerCase())).map((contato) => (
                          <CommandItem
                            key={contato.id}
                            value={contato.nome} // Use name for value to help cmdk matching logic if needed
                            className="!pointer-events-auto !opacity-100 cursor-pointer" // Force interactive
                            onSelect={() => {
                              setNovoNegocio({
                                ...novoNegocio,
                                contatoId: contato.id === novoNegocio.contatoId ? "" : contato.id,
                                nome: contato.nome,
                                email: contato.email || "",
                                telefone: contato.telefone || "",
                              });
                              setComboboxContatoAberto(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                novoNegocio.contatoId === contato.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{contato.nome}</span>
                              <span className="text-xs text-muted-foreground">{contato.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium">Nome do negócio <span className="text-red-500">*</span></label>
                <Input
                  className="shadow-none"
                  placeholder="Ex: Contrato Empresa X"
                  value={novoNegocio.nome}
                  onChange={(e) => setNovoNegocio({ ...novoNegocio, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium">Valor Estimado</label>
                <Input
                  className="shadow-none"
                  placeholder="R$ 0,00"
                  value={novoNegocio.valor}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, "");
                    const valorFormatado = (Number(valor) / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    });
                    setNovoNegocio({ ...novoNegocio, valor: valorFormatado });
                  }}
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium">Email</label>
                <Input
                  className="shadow-none"
                  placeholder="contato@empresa.com"
                  value={novoNegocio.email}
                  onChange={(e) => setNovoNegocio({ ...novoNegocio, email: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  className="shadow-none"
                  placeholder="(00) 00000-0000"
                  value={novoNegocio.telefone}
                  onChange={(e) => {
                    const formatted = formatarTelefone(e.target.value);
                    setNovoNegocio({ ...novoNegocio, telefone: formatted });
                  }}
                  maxLength={15}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium">Funil <span className="text-red-500">*</span></label>
                <Select
                  value={novoNegocio.funilId}
                  onValueChange={(val) => {
                    setNovoNegocio({ ...novoNegocio, funilId: val, etapaId: "" });
                    // Trigger refetch of stages if needed or just rely on state if already loaded
                    // For now assuming 'funisDisponiveis' has mostly static config or simple mapping
                    // In real app, changing funnel might need to update stages list
                  }}
                >
                  <SelectTrigger className="shadow-none">
                    <SelectValue placeholder="Selecione o funil" />
                  </SelectTrigger>
                  <SelectContent>
                    {funisDisponiveis.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-medium">Etapa <span className="text-red-500">*</span></label>
                <Select
                  value={novoNegocio.etapaId}
                  onValueChange={(val) => setNovoNegocio({ ...novoNegocio, etapaId: val })}
                  disabled={!novoNegocio.funilId}
                >
                  <SelectTrigger className="shadow-none">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {(funisDisponiveis.find(f => f.id === novoNegocio.funilId)?.etapas || []).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Responsável</label>
                <Select
                  value={novoNegocio.ownerId}
                  onValueChange={(val) => setNovoNegocio({ ...novoNegocio, ownerId: val })}
                >
                  <SelectTrigger className="shadow-none">
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="todos">Selecione...</SelectItem>
                    {membros.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2">
                {novoNegocio.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-white pl-2.5 pr-1.5 py-1 text-xs font-medium border-transparent transition-colors flex items-center gap-1.5 shadow-none rounded-[6px]" style={{
                    backgroundColor: tagsDisponiveis.find(t => t.nome === tag)?.cor ?? "#94a3b8",
                    borderColor: (tagsDisponiveis.find(t => t.nome === tag)?.cor ?? "#94a3b8") + '30'
                  }}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => setNovoNegocio(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
                      className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nova tag"
                    className="h-7 text-xs w-[120px] rounded-[6px] shadow-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && !novoNegocio.tags.includes(val)) {
                          setNovoNegocio(prev => ({ ...prev, tags: [...prev.tags, val] }));
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-dashed gap-1.5 px-3 text-muted-foreground hover:text-foreground hover:border-slate-300 shadow-none rounded-[6px]"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      const val = input.value.trim();
                      if (val && !novoNegocio.tags.includes(val)) {
                        setNovoNegocio(prev => ({ ...prev, tags: [...prev.tags, val] }));
                        input.value = "";
                      }
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                </div>
              </div>

              {tagsDisponiveis.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 rounded-[6px] border border-border/60 bg-muted/30 p-2">
                  {tagsDisponiveis.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (!novoNegocio.tags.includes(tag.nome)) {
                          setNovoNegocio(prev => ({ ...prev, tags: [...prev.tags, tag.nome] }));
                        }
                      }}
                      className="rounded-[6px] px-2 py-1 text-xs text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: tag.cor || "#94a3b8" }}
                    >
                      {tag.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nota inicial</label>
                <Textarea
                  placeholder="Escreva uma observação inicial..."
                  value={novoNegocio.nota}
                  onChange={(e) => setNovoNegocio({ ...novoNegocio, nota: e.target.value })}
                  className="min-h-[80px] shadow-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Arquivos
                </label>
                <div
                  className="border border-dashed border-border rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  onClick={() => arquivoNovoNegocioInputRef.current?.click()}
                >
                  <p className="text-sm text-muted-foreground text-center">
                    Clique para adicionar arquivos ({novoNegocio.arquivos.length} selecionados)
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  ref={arquivoNovoNegocioInputRef}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setNovoNegocio(prev => ({
                        ...prev,
                        arquivos: [...prev.arquivos, ...Array.from(e.target.files || [])]
                      }));
                    }
                  }}
                />
                {novoNegocio.arquivos.length > 0 && (
                  <div className="space-y-1">
                    {novoNegocio.arquivos.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded">
                        <span>{file.name}</span>
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => setNovoNegocio(prev => ({
                            ...prev,
                            arquivos: prev.arquivos.filter((_, i) => i !== idx)
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {erroDados && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100">
                {erroDados}
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50 dark:bg-slate-900">
            <Button variant="ghost" onClick={() => setDialogCriarNegocioAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarNegocio} disabled={enviandoNovoNegocio}>
              {enviandoNovoNegocio ? "Criando..." : "Criar Negócio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogGanhoAberto} onOpenChange={setDialogGanhoAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar ganho</DialogTitle>
            <DialogDescription>
              Ao confirmar, o negócio será marcado como ganho e movido para a etapa
              Ganho do funil.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setDialogGanhoAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmarGanho}>Confirmar ganho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogPerdaAberto} onOpenChange={setDialogPerdaAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como perdido</DialogTitle>
            <DialogDescription>
              Informe o motivo da perda para manter o histórico atualizado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Motivo</label>
              <Select
                value={motivoPerdaSelecionado}
                onValueChange={(valor) => {
                  setMotivoPerdaSelecionado(valor);
                  if (valor !== "Outro") {
                    setMotivoPerdaOutro("");
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motivosPerdaOpcoes.map((motivo) => (
                    <SelectItem key={motivo} value={motivo}>
                      {motivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {motivoPerdaSelecionado === "Outro" && (
              <div className="grid gap-2">
                <label htmlFor="motivo-perda-outro" className="text-sm font-medium">
                  Outro motivo
                </label>
                <Input
                  id="motivo-perda-outro"
                  value={motivoPerdaOutro}
                  onChange={(event) => setMotivoPerdaOutro(event.target.value)}
                  placeholder="Descreva o motivo"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-3 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setDialogPerdaAberto(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmarPerda}>
              Confirmar perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogExcluirDealAberto}
        onOpenChange={setDialogExcluirDealAberto}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir negócio?</DialogTitle>
            <DialogDescription>
              Esta ação remove o negócio do funil e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogExcluirDealAberto(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluirDeal}>
              Excluir negócio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
