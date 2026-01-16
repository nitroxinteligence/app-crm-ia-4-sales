"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowRightLeft,
  CalendarDays,
  Check,
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
  publicUrl?: string;
};

type LogAuditoriaContato = {
  id: string;
  acao: string;
  detalhes?: Record<string, unknown> | null;
  created_at: string;
  autor_id?: string | null;
};

export function VisaoFunil() {
  const { usuario, session } = useAutenticacao();
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
  const [dialogMoverDealAberto, setDialogMoverDealAberto] =
    React.useState(false);
  const [dialogExcluirDealAberto, setDialogExcluirDealAberto] =
    React.useState(false);
  const [dialogPerdaAberto, setDialogPerdaAberto] = React.useState(false);
  const [dialogGanhoAberto, setDialogGanhoAberto] = React.useState(false);
  const [dialogNovoFunilAberto, setDialogNovoFunilAberto] =
    React.useState(false);
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
          "id, nome, telefone, empresa, owner_id, avatar_url, pipeline_id, pipeline_stage_id, created_at, updated_at, contact_tags (tag_id, tags (id, nome, cor))"
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
            valor: 0,
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
    if (!dealAtivo || !workspaceId) {
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
  }, [dealAtivo, workspaceId]);

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
    return ["todos", ...Array.from(todos)];
  }, [deals]);

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
    filtroDataPeriodo,
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
      : ["Sem orçamento", "Sem resposta", "Concorrência", "Outros"];
  const motivosPerdaOpcoes = motivosPerdaBase.includes("Outro")
    ? motivosPerdaBase
    : [...motivosPerdaBase, "Outro"];
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

      return true;
    },
    [garantirTagDisponivel, workspaceId]
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

      return true;
    },
    [encontrarTagDisponivel, workspaceId]
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

  const handleExcluirDeal = () => {
    if (!dealAtivo) return;
    setDeals((atual) => atual.filter((deal) => deal.id !== dealAtivo.id));
    setDialogExcluirDealAberto(false);
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
    setEnviandoArquivoDeal(false);
    event.target.value = "";
  };

  const handleExcluirArquivoDeal = async (arquivo: ArquivoContato) => {
    if (!dealAtivo || !workspaceId) return;

    setArquivoExcluindoId(arquivo.id);

    const token = await obterToken();
    if (!token) {
      setErroDados("Sessão expirada.");
      setArquivoExcluindoId(null);
      return;
    }

    try {
      await deleteR2Object({
        token,
        bucket: "contact-files",
        key: arquivo.storage_path,
      });
    } catch (error) {
      setErroDados("Não foi possível excluir o arquivo.");
      setArquivoExcluindoId(null);
      return;
    }

    const { error: bancoErro } = await supabaseClient
      .from("contact_files")
      .delete()
      .eq("id", arquivo.id)
      .eq("workspace_id", workspaceId);

    if (bancoErro) {
      setErroDados("Não foi possível excluir o arquivo.");
      setArquivoExcluindoId(null);
      return;
    }

    setArquivosDeal((atual) => atual.filter((item) => item.id !== arquivo.id));

    await registrarAuditoria({
      contatoId: dealAtivo.id,
      acao: "Arquivo removido",
      detalhes: { mensagem: `Arquivo ${arquivo.file_name} removido.` },
    });

    setArquivoExcluindoId(null);
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

    if (funilDestino !== pipelineAtivoId) {
      setDealAtivo(null);
    }
    setDialogMoverDealAberto(false);
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
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Aplicar tag" />
              </SelectTrigger>
              <SelectContent>
                {tags
                  .filter((tag) => tag !== "todas")
                  .map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleAplicarOwner}>
              <SelectTrigger className="w-[170px]">
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
        open={Boolean(dealAtivo)}
        onOpenChange={(aberto) => {
          if (!aberto) setDealAtivo(null);
        }}
      >
        <DialogContent className="left-auto right-0 top-0 h-full max-w-[420px] translate-x-0 translate-y-0 rounded-none border-l bg-background p-0 sm:rounded-l-[6px] flex flex-col overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalhes do negócio</DialogTitle>
            <DialogDescription>
              Painel com informações detalhadas do negócio selecionado.
            </DialogDescription>
          </DialogHeader>
          {dealAtivo && (
            <ScrollArea className="flex-1 min-h-0" type="always" scrollHideDelay={0}>
              <div className="flex min-h-full flex-col">
                <div className="border-b border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={
                          dealAtivo.avatarUrl ?? "/avatars/contato-placeholder.svg"
                        }
                        alt={dealAtivo.nome}
                      />
                      <AvatarFallback>{iniciaisDeal(dealAtivo.nome)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-semibold">{dealAtivo.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {dealAtivo.telefone
                          ? formatarTelefone(dealAtivo.telefone)
                          : "Telefone não informado"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid gap-2 rounded-[6px] border border-border/60 bg-card/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Valor</span>
                      <span className="font-semibold">
                        {podeVerValores
                          ? formatarMoeda(dealAtivo.valor, dealAtivo.moeda)
                          : "Valor restrito"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Origem</span>
                      <span>{dealAtivo.origem}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Última atividade</span>
                      <span>{dealAtivo.ultimaAtividade}</span>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[6px] border border-border/60 bg-card/40 p-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/app/inbox">Ver conversa</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleAbrirEditarDeal}
                      >
                        <PencilLine className="h-4 w-4" />
                        Editar negócio
                      </Button>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full gap-2 text-emerald-500 hover:text-emerald-500"
                        onClick={handleAbrirGanho}
                      >
                        <Check className="h-4 w-4 text-emerald-500" />
                        Ganho
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2 text-destructive hover:text-destructive"
                        onClick={handleAbrirPerda}
                      >
                        <X className="h-4 w-4 text-destructive" />
                        Perdido
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleAbrirMoverDeal}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Mover
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2 text-destructive hover:text-destructive"
                        onClick={() => setDialogExcluirDealAberto(true)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        Excluir negócio
                      </Button>
                    </div>
                    <Separator />
                    <div className="grid gap-2">
                      <span className="text-xs text-muted-foreground">
                        Atribuir owner
                      </span>
                      <Select
                        value={dealAtivo.owner}
                        onValueChange={(owner) =>
                          atualizarDeal(dealAtivo.id, { owner })
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

                  <div className="rounded-[6px] border border-border/60 bg-card/40 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">Tags do negócio</p>
                      <Badge variant="secondary">{dealAtivo.tags.length}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {dealAtivo.tags.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhuma tag adicionada.
                        </p>
                      ) : (
                        dealAtivo.tags.map((tag) => (
                          <Badge
                            key={tag}
                            className="gap-1 text-white"
                            style={{
                              backgroundColor: coresTags[tag] ?? "#94a3b8",
                            }}
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => void handleRemoverTagDeal(tag)}
                              className="rounded-full p-0.5 text-white/80 transition hover:text-white"
                              aria-label={`Remover tag ${tag}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                    {tagsDisponiveisDeal.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 rounded-[6px] border border-border/60 bg-muted/30 p-2">
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
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        value={novaTagDeal}
                        onChange={(event) => setNovaTagDeal(event.target.value)}
                        placeholder="Adicionar tag"
                      />
                      <Button size="sm" onClick={() => void handleAdicionarTagDeal()}>
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="visao-geral">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
                      <TabsTrigger value="conversas">Conversas</TabsTrigger>
                      <TabsTrigger value="atividades">Atividades</TabsTrigger>
                    </TabsList>
                    <TabsContent value="visao-geral" className="pt-4">
                      <div className="space-y-3 text-sm">
                        <p className="font-medium">Resumo do negócio</p>
                        <p className="text-muted-foreground">
                          {dealAtivo.ultimaMensagem}
                        </p>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Funil</span>
                            <span>
                              {funisDisponiveis.find(
                                (funil) => funil.id === dealAtivo.funilId
                              )?.nome ?? "Pipeline"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Etapa</span>
                            <span>
                              {etapas.find((etapa) => etapa.id === dealAtivo.etapaId)?.nome ??
                                "Não definido"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Owner</span>
                            <span>{dealAtivo.owner}</span>
                          </div>
                          {dealAtivo.status === "perdido" && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Motivo da perda
                              </span>
                              <span>
                                {dealAtivo.motivoPerda ?? "Não informado"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="conversas" className="pt-4">
                      <div className="rounded-[6px] border border-border/60 bg-card/40 p-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Última mensagem registrada
                          </span>
                          <Button variant="link" size="sm" asChild>
                            <Link href="/app/inbox">Ver conversa</Link>
                          </Button>
                        </div>
                        <p className="mt-2 text-muted-foreground">
                          {dealAtivo.ultimaMensagem}
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="atividades" className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-card/40 p-3 text-sm">
                          <span className="text-xs text-muted-foreground">
                            Atividades do negócio
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDialogAtividadeAberto(true)}
                          >
                            Agendar atividade
                          </Button>
                        </div>
                        {atividadesDeal.length === 0 ? (
                          <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                            Nenhuma atividade registrada ainda.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {atividadesDeal.map((atividade, index) => (
                              <div
                                key={`${atividade.titulo}-${index}`}
                                className="rounded-[6px] border border-border/60 bg-background/80 p-3 text-xs"
                              >
                                <p className="text-sm font-medium">
                                  {atividade.titulo}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2 text-muted-foreground">
                                  {atividade.data && <span>{atividade.data}</span>}
                                  {atividade.hora && <span>{atividade.hora}</span>}
                                  {atividade.responsavel && (
                                    <span>{atividade.responsavel}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Tabs defaultValue="notas">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="notas">Notas</TabsTrigger>
                      <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
                      <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
                    </TabsList>
                    <TabsContent value="notas" className="pt-4">
                      <div className="space-y-3">
                        <div className="rounded-[6px] border border-border/60 bg-card/40 p-3">
                          <p className="text-xs text-muted-foreground">
                            Nova nota
                          </p>
                          <Textarea
                            value={notaAtual}
                            onChange={(event) => setNotaAtual(event.target.value)}
                            placeholder="Escreva uma nota interna sobre este negócio"
                            className="mt-2 min-h-[96px]"
                          />
                          <Button
                            size="sm"
                            className="mt-3"
                            onClick={() => handleSalvarNota(false)}
                            disabled={!notaAtual.trim() || enviandoNota}
                          >
                            {enviandoNota ? "Salvando..." : "Adicionar nota"}
                          </Button>
                        </div>
                        {carregandoDetalhesDeal ? (
                          <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                            Carregando notas...
                          </div>
                        ) : notasDeal.length === 0 ? (
                          <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                            Nenhuma nota adicionada ainda.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {notasDeal.map((nota) => (
                              <div
                                key={nota.id}
                                className="rounded-[6px] border border-border/60 bg-background/80 p-3 text-xs text-muted-foreground"
                              >
                                <div className="flex items-start justify-between gap-2 text-[10px] text-muted-foreground">
                                  <div>
                                    <p>{formatarDataHora(nota.created_at)}</p>
                                    <p>
                                      {nota.autor_id === session?.user.id
                                        ? "Você"
                                        : "Equipe"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleIniciarEdicaoNota(nota)}
                                      disabled={salvandoNotaEditada}
                                      aria-label="Editar nota"
                                    >
                                      <PencilLine className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleExcluirNota(nota.id)}
                                      disabled={salvandoNotaEditada}
                                      aria-label="Excluir nota"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                {notaEditandoId === nota.id ? (
                                  <div className="mt-2 space-y-2">
                                    <Textarea
                                      value={notaEditandoConteudo}
                                      onChange={(event) =>
                                        setNotaEditandoConteudo(event.target.value)
                                      }
                                      className="min-h-[96px] text-sm"
                                    />
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={handleSalvarNotaEditada}
                                        disabled={
                                          !notaEditandoConteudo.trim() ||
                                          salvandoNotaEditada
                                        }
                                      >
                                        {salvandoNotaEditada ? "Salvando..." : "Salvar"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelarEdicaoNota}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-2 text-sm text-foreground">
                                    {nota.conteudo}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="arquivos" className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-card/40 p-3 text-sm">
                          <span className="text-xs text-muted-foreground">
                            Arquivos anexados
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => arquivoDealInputRef.current?.click()}
                            disabled={enviandoArquivoDeal}
                          >
                            {enviandoArquivoDeal ? "Enviando..." : "Adicionar"}
                          </Button>
                        </div>
                        {carregandoDetalhesDeal ? (
                          <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                            Carregando arquivos...
                          </div>
                        ) : arquivosDeal.length === 0 ? (
                          <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                            Nenhum arquivo enviado ainda.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {arquivosDeal.map((arquivo) => (
                              <div
                                key={arquivo.id}
                                className="flex items-center justify-between rounded-[6px] border border-border/60 bg-background/80 p-3 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {arquivo.file_name}
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
                      </div>
                    </TabsContent>
                    <TabsContent value="auditoria" className="pt-4">
                      {carregandoAuditoriaDeal ? (
                        <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                          Carregando auditoria...
                        </div>
                      ) : logsAuditoriaDeal.length === 0 ? (
                        <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                          Nenhuma alteração registrada para este negócio.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {logsAuditoriaDeal.map((log) => (
                            <div
                              key={log.id}
                              className="rounded-[6px] border border-border/60 bg-background/80 p-3 text-xs"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">{log.acao}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatarDataHora(log.created_at)} ·{" "}
                                    {log.autor_id === session?.user.id
                                      ? "Você"
                                      : "Equipe"}
                                  </p>
                                </div>
                              </div>
                              {formatarDetalhesAuditoria(log.detalhes) && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {formatarDetalhesAuditoria(log.detalhes)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                <input
                  ref={arquivoDealInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleSelecionarArquivoDeal}
                />
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogEditarDealAberto}
        onOpenChange={setDialogEditarDealAberto}
      >
        <DialogContent>
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
              <Input
                id="editar-deal-produto"
                value={formEditarDeal.produto}
                onChange={(event) =>
                  setFormEditarDeal((atual) => ({
                    ...atual,
                    produto: event.target.value,
                  }))
                }
                placeholder="Produto relacionado"
              />
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
                <SelectTrigger className="w-full">
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
                <SelectTrigger className="w-full">
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
