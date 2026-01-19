"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  FileDown,
  History,
  MessageSquare,
  Paperclip,
  PencilLine,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserPlus,
  X,
  XCircle,
  ArrowRightLeft,
  Building2,
  User,
} from "lucide-react";
import type { CanalId, ContatoCRM, Pipeline, Role, StatusContato } from "@/lib/types";
import { mascararEmail, mascararTelefone } from "@/lib/mascaramento";
import { supabaseClient } from "@/lib/supabase/client";
import { buildR2PublicUrl } from "@/lib/r2/public";
import { deleteR2Object, uploadFileToR2 } from "@/lib/r2/browser";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { podeVerDadosSensiveis } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const LIMITE_INICIAL = 32;
const OWNER_SEM = "sem-owner";
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

type PipelineEtapa = {
  id: string;
  nome: string;
  ordem: number;
  cor?: string | null;
};

type TagSelecionada = {
  id?: string;
  nome: string;
  cor: string;
};

type NotaContato = {
  id: string;
  conteudo: string;
  created_at: string;
  autor_id?: string | null;
};

type ArquivoContato = {
  id: string;
  file_name: string;
  storage_path: string;
  publicUrl?: string | null;
  mime_type?: string | null;
  tamanho_bytes?: number | null;
  created_at: string;
};

type ConversaContato = {
  id: string;
  canal: CanalId;
  ultima_mensagem?: string | null;
  ultima_mensagem_em?: string | null;
};

type CsvMapping = {
  nome?: number;
  telefone?: number;
  email?: number;
  empresa?: number;
};

type CsvData = {
  headers: string[];
  rows: string[][];
  mapping: CsvMapping;
};

type LogAuditoriaContato = {
  id: string;
  acao: string;
  detalhes?: Record<string, unknown> | null;
  created_at: string;
  autor_id?: string | null;
};

const statusLabel: Record<StatusContato, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  "em-negociacao": "Em negociação",
  cliente: "Cliente",
  inativo: "Inativo",
};

const iniciaisContato = (nome: string) =>
  nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatarUltimaAtividade = (valor?: string | null) => {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return `${data.toLocaleDateString("pt-BR")} ${data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const formatarDataHora = (valor?: string | null) => {
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

const formatarBytes = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return "0 B";
  const unidades = ["B", "KB", "MB", "GB"];
  const indice = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    unidades.length - 1
  );
  const valor = bytes / Math.pow(1024, indice);
  return `${valor.toFixed(valor < 10 && indice > 0 ? 1 : 0)} ${unidades[indice]}`;
};

const apenasNumeros = (valor: string) => valor.replace(/\D/g, "");

const formatarTelefone = (valor: string) => {
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

const detectarSeparadorCsv = (linha: string) => {
  const virgulas = (linha.match(/,/g) ?? []).length;
  const pontos = (linha.match(/;/g) ?? []).length;
  return pontos > virgulas ? ";" : ",";
};

const parseLinhaCsv = (linha: string, separador: string) => {
  const resultado: string[] = [];
  let atual = "";
  let entreAspas = false;

  for (let i = 0; i < linha.length; i += 1) {
    const caractere = linha[i];

    if (caractere === "\"") {
      if (entreAspas && linha[i + 1] === "\"") {
        atual += "\"";
        i += 1;
      } else {
        entreAspas = !entreAspas;
      }
      continue;
    }

    if (caractere === separador && !entreAspas) {
      resultado.push(atual.trim());
      atual = "";
      continue;
    }

    atual += caractere;
  }

  resultado.push(atual.trim());
  return resultado;
};

const detectarMapeamentoCsv = (headers: string[]): CsvMapping => {
  const normalizados = headers.map(normalizarTexto);
  const encontrar = (alternativas: string[]) =>
    normalizados.findIndex((valor) => alternativas.includes(valor));

  const mapping: CsvMapping = {};
  const nomeIdx = encontrar(["nome", "name", "contato"]);
  const telefoneIdx = encontrar(["telefone", "phone", "celular", "whatsapp"]);
  const emailIdx = encontrar(["email", "e-mail", "mail"]);
  const empresaIdx = encontrar(["empresa", "company", "organizacao", "organization"]);

  if (nomeIdx >= 0) mapping.nome = nomeIdx;
  if (telefoneIdx >= 0) mapping.telefone = telefoneIdx;
  if (emailIdx >= 0) mapping.email = emailIdx;
  if (empresaIdx >= 0) mapping.empresa = empresaIdx;

  return mapping;
};

const parseCsvTexto = (conteudo: string) => {
  const limpo = conteudo.replace(/^\uFEFF/, "");
  const linhas = limpo
    .split(/\r?\n/)
    .map((linha) => linha.trimEnd())
    .filter((linha) => linha.trim() !== "");

  if (linhas.length === 0) {
    return { headers: [] as string[], rows: [] as string[][] };
  }

  const separador = detectarSeparadorCsv(linhas[0]);
  const headers = parseLinhaCsv(linhas[0], separador);
  const rows = linhas
    .slice(1)
    .map((linha) => parseLinhaCsv(linha, separador))
    .filter((linha) => linha.some((valor) => valor.trim() !== ""));

  return { headers, rows };
};

export function VisaoContatos() {
  const { session } = useAutenticacao();
  const searchParams = useSearchParams();
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<
    "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER"
  >("MEMBER");
  const [carregando, setCarregando] = React.useState(true);
  const [carregandoPipelines, setCarregandoPipelines] = React.useState(false);
  const [erroDados, setErroDados] = React.useState<string | null>(null);
  const [erroPipelines, setErroPipelines] = React.useState<string | null>(null);
  const podeVer = podeVerDadosSensiveis(role as Role);

  const obterToken = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const [contatos, setContatos] = React.useState<ContatoCRM[]>([]);
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [tagsExistentes, setTagsExistentes] = React.useState<
    Array<{ id: string; nome: string; cor?: string | null }>
  >([]);
  const [tagsSelecionadas, setTagsSelecionadas] = React.useState<
    TagSelecionada[]
  >([]);
  const [tagInput, setTagInput] = React.useState("");
  const [busca, setBusca] = React.useState("");
  const [filtroStatus, setFiltroStatus] = React.useState<
    StatusContato | "todos"
  >("todos");
  const [filtroOwner, setFiltroOwner] = React.useState("todos");
  const [filtroTag, setFiltroTag] = React.useState("todas");
  const [filtroSomenteComEmpresa, setFiltroSomenteComEmpresa] =
    React.useState(false);
  const [filtroSomenteComTags, setFiltroSomenteComTags] = React.useState(false);
  const [limite, setLimite] = React.useState(LIMITE_INICIAL);
  const [selecionados, setSelecionados] = React.useState<string[]>([]);
  const [contatoAtivo, setContatoAtivo] = React.useState<ContatoCRM | null>(
    null
  );
  const [dialogEditarContatoAberto, setDialogEditarContatoAberto] =
    React.useState(false);
  const [dialogExcluirAberto, setDialogExcluirAberto] = React.useState(false);
  const [dialogExcluirContatoAberto, setDialogExcluirContatoAberto] = React.useState(false);
  const [excluindoContato, setExcluindoContato] = React.useState(false);
  const [dialogExportarAberto, setDialogExportarAberto] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dialogImportarAberto, setDialogImportarAberto] = React.useState(false);
  const [dialogNovoContatoAberto, setDialogNovoContatoAberto] =
    React.useState(false);
  const [abaContato, setAbaContato] = React.useState("notas");
  const [notasContato, setNotasContato] = React.useState<NotaContato[]>([]);
  const [arquivosContato, setArquivosContato] = React.useState<ArquivoContato[]>(
    []
  );
  const [conversaContato, setConversaContato] =
    React.useState<ConversaContato | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = React.useState(false);
  const [notaAtual, setNotaAtual] = React.useState("");
  const [enviandoNota, setEnviandoNota] = React.useState(false);
  const [enviandoArquivo, setEnviandoArquivo] = React.useState(false);
  const [enviandoAvatar, setEnviandoAvatar] = React.useState(false);
  const [notaEditandoId, setNotaEditandoId] = React.useState<string | null>(null);
  const [notaEditandoConteudo, setNotaEditandoConteudo] = React.useState("");
  const [salvandoNotaEditada, setSalvandoNotaEditada] = React.useState(false);
  const [arquivoExcluindoId, setArquivoExcluindoId] =
    React.useState<string | null>(null);
  const [logsAuditoria, setLogsAuditoria] = React.useState<
    LogAuditoriaContato[]
  >([]);
  const [carregandoAuditoria, setCarregandoAuditoria] = React.useState(false);
  const [csvArquivo, setCsvArquivo] = React.useState<File | null>(null);
  const [csvDados, setCsvDados] = React.useState<CsvData | null>(null);
  const [csvErro, setCsvErro] = React.useState<string | null>(null);
  const [csvImportando, setCsvImportando] = React.useState(false);
  const [csvResumo, setCsvResumo] = React.useState<string | null>(null);
  const [tagsEditadas, setTagsEditadas] = React.useState<TagSelecionada[]>([]);
  const [tagEditarInput, setTagEditarInput] = React.useState("");
  const [novoContato, setNovoContato] = React.useState({
    nome: "",
    telefone: "",
    email: "",
    empresa: "",
    pipelineId: "",
    stageId: "",
    owner: "",
  });
  const [formEditarContato, setFormEditarContato] = React.useState({
    nome: "",
    telefone: "",
    email: "",
    empresa: "",
    status: "novo" as StatusContato,
    pipelineId: "",
    stageId: "",
    owner: "",
  });

  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const arquivoInputRef = React.useRef<HTMLInputElement | null>(null);

  // State for Tags in contact detail view
  const [novaTagContato, setNovaTagContato] = React.useState("");
  // State for viewing note details modal
  const [notaVisualizada, setNotaVisualizada] = React.useState<NotaContato | null>(null);



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

      if (contatoAtivo?.id === contatoId) {
        setLogsAuditoria((atual) => [data, ...atual]);
      }

      return data;
    },
    [contatoAtivo?.id, session?.user.id, workspaceId]
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
      .select("workspace_id, role")
      .eq("user_id", sessao.user.id)
      .maybeSingle();

    if (error || !data?.workspace_id) {
      setWorkspaceId(null);
      setCarregando(false);
      return;
    }

    setWorkspaceId(data.workspace_id);
    setRole((data.role ?? "MEMBER") as "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER");
  }, []);

  const carregarContatos = React.useCallback(async () => {
    if (!workspaceId) return;
    setCarregando(true);
    setErroDados(null);

    const { data, error } = await supabaseClient
      .from("contacts")
      .select(
        "id, nome, telefone, email, empresa, status, owner_id, avatar_url, pipeline_id, pipeline_stage_id, created_at, updated_at, contact_tags (tag_id, tags (id, nome, cor))"
      )
      .eq("workspace_id", workspaceId)
      .eq("tipo", "contato")
      .order("updated_at", { ascending: false });

    if (error || !data) {
      setErroDados("Não foi possível carregar os contatos.");
      setCarregando(false);
      return;
    }

    const mapeados: ContatoCRM[] = data.map((item) => {
      const tagsContato = (item.contact_tags ?? [])
        .map((tagRel) => {
          const tagItem = Array.isArray(tagRel.tags) ? tagRel.tags[0] : tagRel.tags;
          return tagItem?.nome ?? null;
        })
        .filter(Boolean) as string[];

      return {
        id: item.id,
        nome: item.nome ?? "Contato",
        telefone: item.telefone ?? "",
        email: item.email ?? "",
        empresa: item.empresa ?? undefined,
        status: (item.status ?? "novo") as StatusContato,
        tags: tagsContato,
        owner: labelOwner(item.owner_id),
        ownerId: item.owner_id ?? undefined,
        avatarUrl: item.avatar_url ?? undefined,
        pipelineId: item.pipeline_id ?? undefined,
        pipelineStageId: item.pipeline_stage_id ?? undefined,
        ultimaAtividade: formatarUltimaAtividade(item.updated_at ?? item.created_at),
      };
    });

    setContatos(mapeados);
    setCarregando(false);
  }, [labelOwner, workspaceId]);

  const carregarPipelines = React.useCallback(async () => {
    if (!workspaceId) return;
    setCarregandoPipelines(true);
    setErroPipelines(null);

    const { data, error } = await supabaseClient
      .from("pipelines")
      .select(
        "id, nome, pipeline_stages (id, nome, ordem, cor)"
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .order("ordem", { foreignTable: "pipeline_stages", ascending: true });

    if (error || !data) {
      setErroPipelines("Não foi possível carregar pipelines.");
      setCarregandoPipelines(false);
      return;
    }

    const mapeadas: Pipeline[] = data.map((item) => {
      const etapas = (item.pipeline_stages ?? [])
        .slice()
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((etapa) => ({
          id: etapa.id,
          nome: etapa.nome,
          ordem: etapa.ordem ?? 0,
          cor: etapa.cor ?? null,
        }));

      return {
        id: item.id,
        nome: item.nome ?? "Pipeline",
        etapas,
      };
    });

    setPipelines(mapeadas);
    setCarregandoPipelines(false);
  }, [workspaceId]);

  const carregarTagsExistentes = React.useCallback(async () => {
    if (!workspaceId) return;
    const { data, error } = await supabaseClient
      .from("tags")
      .select("id, nome, cor")
      .eq("workspace_id", workspaceId)
      .order("nome", { ascending: true });

    if (error || !data) {
      return;
    }

    setTagsExistentes(data);
  }, [workspaceId]);

  const corDaTag = React.useCallback(
    (nome: string) =>
      tagsExistentes.find((tag) => tag.nome === nome)?.cor ?? "#94a3b8",
    [tagsExistentes]
  );

  const obterEtapaContato = React.useCallback(
    (contato: ContatoCRM) => {
      const pipeline = pipelines.find((item) => item.id === contato.pipelineId);
      const etapa = pipeline?.etapas.find(
        (item) => item.id === contato.pipelineStageId
      );
      return {
        nome: etapa?.nome ?? "Sem estágio",
        cor: etapa?.cor ?? "#94a3b8",
      };
    },
    [pipelines]
  );

  React.useEffect(() => {
    if (!session) {
      setWorkspaceId(null);
      setRole("MEMBER");
      setContatos([]);
      setCarregando(false);
      return;
    }

    carregarWorkspace(session).catch(() => null);
  }, [carregarWorkspace, session]);

  React.useEffect(() => {
    if (!workspaceId || contatos.length === 0) return;

    const idParam = searchParams.get("id");
    if (idParam) {
      const contatoAlvo = contatos.find(c => c.id === idParam);
      if (contatoAlvo) {
        setContatoAtivo(contatoAlvo);
      }
    }
  }, [workspaceId, contatos, searchParams]);

  React.useEffect(() => {
    if (!workspaceId) return;
    carregarContatos();
    carregarPipelines();
    carregarTagsExistentes();
  }, [carregarContatos, carregarPipelines, carregarTagsExistentes, workspaceId]);

  React.useEffect(() => {
    if (!workspaceId || contatos.length === 0) return;

    const idParam = searchParams.get("id");
    if (idParam) {
      const contatoAlvo = contatos.find(c => c.id === idParam);
      if (contatoAlvo) {
        setContatoAtivo(contatoAlvo);
      }
    }
  }, [workspaceId, contatos, searchParams]);

  React.useEffect(() => {
    if (!contatoAtivo || !workspaceId) {
      setNotasContato([]);
      setArquivosContato([]);
      setConversaContato(null);
      setLogsAuditoria([]);
      setNotaEditandoId(null);
      setNotaEditandoConteudo("");
      setSalvandoNotaEditada(false);
      setAbaContato("notas");
      setCarregandoDetalhes(false);
      setCarregandoAuditoria(false);
      return;
    }

    const carregarDetalhes = async () => {
      setCarregandoDetalhes(true);
      setCarregandoAuditoria(true);

      const { data: notas } = await supabaseClient
        .from("contact_notes")
        .select("id, conteudo, created_at, autor_id")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contatoAtivo.id)
        .order("created_at", { ascending: false });

      const { data: arquivos } = await supabaseClient
        .from("contact_files")
        .select("id, storage_path, file_name, mime_type, tamanho_bytes, created_at")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contatoAtivo.id)
        .order("created_at", { ascending: false });

      const { data: conversa } = await supabaseClient
        .from("conversations")
        .select("id, canal, ultima_mensagem, ultima_mensagem_em")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contatoAtivo.id)
        .order("ultima_mensagem_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: auditoria } = await supabaseClient
        .from("contact_audit")
        .select("id, acao, detalhes, created_at, autor_id")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contatoAtivo.id)
        .order("created_at", { ascending: false });

      const arquivosComUrl =
        arquivos?.map((arquivo) => ({
          ...arquivo,
          publicUrl: buildR2PublicUrl("contact-files", arquivo.storage_path),
        })) ?? [];

      setNotasContato(notas ?? []);
      setArquivosContato(arquivosComUrl);
      setConversaContato(conversa ?? null);
      setLogsAuditoria(auditoria ?? []);
      setCarregandoDetalhes(false);
      setCarregandoAuditoria(false);
      setAbaContato("notas");
    };

    void carregarDetalhes();
  }, [contatoAtivo, workspaceId]);

  React.useEffect(() => {
    if (!dialogNovoContatoAberto || pipelines.length === 0) return;
    setNovoContato((atual) => {
      if (atual.pipelineId) return atual;
      const pipeline = pipelines[0];
      const etapa = pipeline.etapas[0];
      return {
        ...atual,
        pipelineId: pipeline.id,
        stageId: etapa?.id ?? "",
      };
    });
  }, [dialogNovoContatoAberto, pipelines]);

  const owners = React.useMemo(() => {
    const todos = new Set<string>();
    contatos.forEach((contato) => {
      if (contato.ownerId) todos.add(contato.ownerId);
    });
    if (session?.user.id) {
      todos.add(session.user.id);
    }
    return ["todos", ...Array.from(todos), OWNER_SEM];
  }, [contatos, session]);

  const tags = React.useMemo(() => {
    const todos = new Set(contatos.flatMap((contato) => contato.tags));
    return ["todas", ...Array.from(todos)];
  }, [contatos]);

  const tagsDisponiveisCriacao = React.useMemo(() => {
    const termo = tagInput.trim().toLowerCase();
    return tagsExistentes.filter((tag) => {
      const jaSelecionada = tagsSelecionadas.some(
        (item) => normalizarTexto(item.nome) === normalizarTexto(tag.nome)
      );
      if (jaSelecionada) return false;
      if (!termo) return true;
      return tag.nome.toLowerCase().includes(termo);
    });
  }, [tagInput, tagsExistentes, tagsSelecionadas]);

  const tagsDisponiveisEdicao = React.useMemo(() => {
    const termo = tagEditarInput.trim().toLowerCase();
    return tagsExistentes.filter((tag) => {
      const jaSelecionada = tagsEditadas.some(
        (item) => normalizarTexto(item.nome) === normalizarTexto(tag.nome)
      );
      if (jaSelecionada) return false;
      if (!termo) return true;
      return tag.nome.toLowerCase().includes(termo);
    });
  }, [tagEditarInput, tagsEditadas, tagsExistentes]);

  const contatosFiltrados = React.useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return contatos.filter((contato) => {
      if (filtroStatus !== "todos" && contato.status !== filtroStatus) {
        return false;
      }
      if (filtroOwner !== "todos") {
        if (filtroOwner === OWNER_SEM) {
          if (contato.ownerId) return false;
        } else if (contato.ownerId !== filtroOwner) {
          return false;
        }
      }
      if (filtroTag !== "todas" && !contato.tags.includes(filtroTag)) {
        return false;
      }
      if (filtroSomenteComEmpresa && !contato.empresa) {
        return false;
      }
      if (filtroSomenteComTags && contato.tags.length === 0) {
        return false;
      }
      if (!termo) return true;
      return (
        contato.nome.toLowerCase().includes(termo) ||
        contato.telefone.toLowerCase().includes(termo) ||
        contato.email.toLowerCase().includes(termo) ||
        (contato.empresa ?? "").toLowerCase().includes(termo)
      );
    });
  }, [
    busca,
    contatos,
    filtroOwner,
    filtroSomenteComEmpresa,
    filtroSomenteComTags,
    filtroStatus,
    filtroTag,
  ]);

  const selecionadosSet = React.useMemo(
    () => new Set(selecionados),
    [selecionados]
  );

  const pipelineContato = React.useMemo(() => {
    if (!contatoAtivo) return null;
    const pipeline =
      pipelines.find((item) => item.id === contatoAtivo.pipelineId) ?? null;
    const etapa =
      pipeline?.etapas.find((item) => item.id === contatoAtivo.pipelineStageId) ??
      null;
    return { pipeline, etapa };
  }, [contatoAtivo, pipelines]);

  const etapasEditar = React.useMemo(() => {
    const pipeline = pipelines.find(
      (item) => item.id === formEditarContato.pipelineId
    );
    return pipeline?.etapas ?? [];
  }, [formEditarContato.pipelineId, pipelines]);

  const contatosVisiveis = contatosFiltrados.slice(0, limite);
  const temMais = contatosFiltrados.length > contatosVisiveis.length;
  const idsVisiveis = contatosVisiveis.map((contato) => contato.id);
  const todosSelecionados =
    idsVisiveis.length > 0 &&
    idsVisiveis.every((id) => selecionadosSet.has(id));
  const algumSelecionado =
    idsVisiveis.length > 0 &&
    idsVisiveis.some((id) => selecionadosSet.has(id));

  const filtroAtivoCount = [
    busca.trim().length > 0,
    filtroStatus !== "todos",
    filtroOwner !== "todos",
    filtroTag !== "todas",
    filtroSomenteComEmpresa,
    filtroSomenteComTags,
  ].filter(Boolean).length;

  React.useEffect(() => {
    setLimite(LIMITE_INICIAL);
    setSelecionados([]);
  }, [
    busca,
    filtroOwner,
    filtroSomenteComEmpresa,
    filtroSomenteComTags,
    filtroStatus,
    filtroTag,
  ]);

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const alvo = event.currentTarget;
      const chegouNoFim =
        alvo.scrollTop + alvo.clientHeight >= alvo.scrollHeight - 80;
      if (chegouNoFim && temMais) {
        setLimite((atual) =>
          Math.min(atual + 24, contatosFiltrados.length)
        );
      }
    },
    [contatosFiltrados.length, temMais]
  );

  const handleSelecionarTodos = (valor: boolean) => {
    setSelecionados(valor ? idsVisiveis : []);
  };

  const handleToggleSelecionado = (id: string) => {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
    );
  };

  const handleAplicarTag = async (tag: string) => {
    if (!tag || selecionados.length === 0 || !workspaceId) return;
    setCarregando(true);
    setErroDados(null);

    const { data: tagExistente, error: tagErro } = await supabaseClient
      .from("tags")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("nome", tag)
      .maybeSingle();

    if (tagErro) {
      setErroDados("Falha ao aplicar tag.");
      setCarregando(false);
      return;
    }

    let tagId = tagExistente?.id ?? null;

    if (!tagId) {
      const { data: tagCriada, error: tagCriarErro } = await supabaseClient
        .from("tags")
        .insert({ workspace_id: workspaceId, nome: tag, cor: gerarCorTag() })
        .select("id")
        .single();

      if (tagCriarErro || !tagCriada) {
        setErroDados("Falha ao criar tag.");
        setCarregando(false);
        return;
      }

      tagId = tagCriada.id;
    }

    const payload = selecionados.map((contatoId) => ({
      workspace_id: workspaceId,
      contact_id: contatoId,
      tag_id: tagId,
    }));

    const { error: vinculoErro } = await supabaseClient
      .from("contact_tags")
      .upsert(payload, { onConflict: "contact_id,tag_id" });

    if (vinculoErro) {
      setErroDados("Falha ao vincular tag.");
      setCarregando(false);
      return;
    }

    await carregarContatos();
    await carregarTagsExistentes();
    await Promise.all(
      selecionados.map((contatoId) =>
        registrarAuditoria({
          contatoId,
          acao: "Tag aplicada",
          detalhes: { mensagem: `Tag ${tag} aplicada.` },
        })
      )
    );
    setCarregando(false);
  };

  const handleAplicarStatus = async (status: string) => {
    if (!status || selecionados.length === 0 || !workspaceId) return;
    setCarregando(true);
    setErroDados(null);

    const { error } = await supabaseClient
      .from("contacts")
      .update({ status })
      .in("id", selecionados)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Falha ao atualizar status.");
      setCarregando(false);
      return;
    }

    await carregarContatos();
    await Promise.all(
      selecionados.map((contatoId) =>
        registrarAuditoria({
          contatoId,
          acao: "Status atualizado",
          detalhes: { mensagem: `Status definido para ${status}.` },
        })
      )
    );
    setCarregando(false);
  };

  const handleAplicarOwner = async (owner: string) => {
    if (!owner || selecionados.length === 0 || !workspaceId) return;
    setCarregando(true);
    setErroDados(null);

    const ownerId = owner === OWNER_SEM ? null : owner;

    const { error } = await supabaseClient
      .from("contacts")
      .update({ owner_id: ownerId })
      .in("id", selecionados)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Falha ao atualizar owner.");
      setCarregando(false);
      return;
    }

    await carregarContatos();
    await Promise.all(
      selecionados.map((contatoId) =>
        registrarAuditoria({
          contatoId,
          acao: "Owner atualizado",
          detalhes: {
            mensagem:
              ownerId === null
                ? "Owner removido."
                : `Owner definido para ${labelOwner(ownerId)}.`,
          },
        })
      )
    );
    setCarregando(false);
  };

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0 || !workspaceId) return;
    setCarregando(true);
    setErroDados(null);

    const { error } = await supabaseClient
      .from("contacts")
      .delete()
      .in("id", selecionados)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Falha ao excluir contatos.");
      setCarregando(false);
      return;
    }

    setSelecionados([]);
    setDialogExcluirAberto(false);
    await carregarContatos();
    setCarregando(false);
  };

  const handleExcluirContatoAtivo = async () => {
    if (!contatoAtivo || !workspaceId) return;
    setExcluindoContato(true);
    setErroDados(null);

    const { error } = await supabaseClient
      .from("contacts")
      .delete()
      .eq("id", contatoAtivo.id)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Falha ao excluir contato.");
      setExcluindoContato(false);
      return;
    }

    setDialogExcluirContatoAberto(false);
    setContatoAtivo(null);
    await carregarContatos();
    setExcluindoContato(false);
  };

  const handleLimparFiltros = () => {
    setBusca("");
    setFiltroStatus("todos");
    setFiltroOwner("todos");
    setFiltroTag("todas");
    setFiltroSomenteComEmpresa(false);
    setFiltroSomenteComTags(false);
  };

  const pipelineSelecionado = React.useMemo(() => {
    return pipelines.find((pipeline) => pipeline.id === novoContato.pipelineId);
  }, [novoContato.pipelineId, pipelines]);

  const etapasDisponiveis = pipelineSelecionado?.etapas ?? [];

  const handleSelecionarPipeline = (pipelineId: string) => {
    const pipeline = pipelines.find((item) => item.id === pipelineId);
    setNovoContato((atual) => ({
      ...atual,
      pipelineId,
      stageId: pipeline?.etapas[0]?.id ?? "",
    }));
  };

  const resolverTagExistente = React.useCallback(
    async (valor: string): Promise<TagSelecionada | null> => {
      const nomeTag = valor.trim();
      if (!nomeTag) return null;
      const nomeNormalizado = normalizarTexto(nomeTag);
      const tagExistente = tagsExistentes.find(
        (tag) => normalizarTexto(tag.nome) === nomeNormalizado
      );
      if (tagExistente) {
        return {
          id: tagExistente.id,
          nome: tagExistente.nome,
          cor: tagExistente.cor ?? gerarCorTag(),
        };
      }

      const cor = gerarCorTag();
      if (!workspaceId) {
        return { nome: nomeTag, cor };
      }

      const { data, error } = await supabaseClient
        .from("tags")
        .insert({ workspace_id: workspaceId, nome: nomeTag, cor })
        .select("id, nome, cor")
        .single();

      if (error || !data) {
        setErroDados("Falha ao criar tag.");
        return { nome: nomeTag, cor };
      }

      setTagsExistentes((atual) => {
        const jaExiste = atual.some(
          (tag) => normalizarTexto(tag.nome) === normalizarTexto(data.nome)
        );
        if (jaExiste) return atual;
        return [...atual, data];
      });

      return {
        id: data.id,
        nome: data.nome,
        cor: data.cor ?? cor,
      };
    },
    [tagsExistentes, workspaceId]
  );

  const adicionarTagSelecionada = async (valor: string) => {
    const nomeTag = valor.trim();
    if (!nomeTag) return;

    const jaExiste = tagsSelecionadas.some(
      (tag) => normalizarTexto(tag.nome) === normalizarTexto(nomeTag)
    );
    if (jaExiste) {
      setTagInput("");
      return;
    }

    const tagResolvida = await resolverTagExistente(nomeTag);
    if (!tagResolvida) {
      setTagInput("");
      return;
    }
    setTagsSelecionadas((atual) => [
      ...atual,
      tagResolvida,
    ]);
    setTagInput("");
  };

  const removerTagSelecionada = (nome: string) => {
    setTagsSelecionadas((atual) =>
      atual.filter((tag) => tag.nome !== nome)
    );
  };

  const adicionarTagEditada = async (valor: string) => {
    const nomeTag = valor.trim();
    if (!nomeTag) return;

    const jaExiste = tagsEditadas.some(
      (tag) => normalizarTexto(tag.nome) === normalizarTexto(nomeTag)
    );
    if (jaExiste) {
      setTagEditarInput("");
      return;
    }

    const tagResolvida = await resolverTagExistente(nomeTag);
    if (!tagResolvida) {
      setTagEditarInput("");
      return;
    }
    setTagsEditadas((atual) => [
      ...atual,
      tagResolvida,
    ]);
    setTagEditarInput("");
  };

  const removerTagEditada = (nome: string) => {
    setTagsEditadas((atual) =>
      atual.filter((tag) => tag.nome !== nome)
    );
  };

  // Handler to add a tag to the active contact in detail view
  const handleAdicionarTagContato = async (tagNome?: string) => {
    const nomeTag = (tagNome ?? novaTagContato).trim();
    if (!nomeTag || !contatoAtivo || !workspaceId || !session?.user.id) return;

    // Check if tag already exists on this contact
    const jaExiste = contatoAtivo.tags.some(
      (t) => normalizarTexto(t) === normalizarTexto(nomeTag)
    );
    if (jaExiste) {
      setNovaTagContato("");
      return;
    }

    // Resolve or create the tag
    const tagResolvida = await resolverTagExistente(nomeTag);
    if (!tagResolvida) {
      setNovaTagContato("");
      return;
    }

    // Insert into contact_tags
    const { error } = await supabaseClient.from("contact_tags").upsert(
      {
        workspace_id: workspaceId,
        contact_id: contatoAtivo.id,
        tag_id: tagResolvida.id,
      },
      { onConflict: "contact_id,tag_id" }
    );

    if (!error) {
      // Update local state
      setContatoAtivo((atual) =>
        atual ? { ...atual, tags: [...atual.tags, tagResolvida.nome] } : null
      );
      setContatos((atual) =>
        atual.map((c) =>
          c.id === contatoAtivo.id ? { ...c, tags: [...c.tags, tagResolvida.nome] } : c
        )
      );
      await registrarAuditoria({
        contatoId: contatoAtivo.id,
        acao: "tag_adicionada",
        detalhes: { tag: tagResolvida.nome },
      });
    }
    setNovaTagContato("");
  };

  // Handler to remove a tag from the active contact in detail view
  const handleRemoverTagContato = async (tagNome: string) => {
    if (!contatoAtivo || !workspaceId) return;

    // Find tag ID from tagsExistentes
    const tagInfo = tagsExistentes.find(
      (t) => normalizarTexto(t.nome) === normalizarTexto(tagNome)
    );
    if (!tagInfo) return;

    const { error } = await supabaseClient
      .from("contact_tags")
      .delete()
      .eq("contact_id", contatoAtivo.id)
      .eq("tag_id", tagInfo.id);

    if (!error) {
      setContatoAtivo((atual) =>
        atual ? { ...atual, tags: atual.tags.filter((t) => t !== tagNome) } : null
      );
      setContatos((atual) =>
        atual.map((c) =>
          c.id === contatoAtivo.id ? { ...c, tags: c.tags.filter((t) => t !== tagNome) } : c
        )
      );
      await registrarAuditoria({
        contatoId: contatoAtivo.id,
        acao: "tag_removida",
        detalhes: { tag: tagNome },
      });
    }
  };

  const processarArquivoImportacao = async (arquivo: File) => {
    setCsvArquivo(arquivo);
    setCsvErro(null);
    setCsvResumo(null);

    const isExcel = arquivo.name.endsWith('.xlsx') || arquivo.name.endsWith('.xls');

    try {
      let headers: string[] = [];
      let rows: string[][] = [];

      if (isExcel) {
        // Dynamic import of xlsx library
        const XLSX = await import('xlsx');
        const buffer = await arquivo.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });

        if (jsonData.length > 0) {
          headers = (jsonData[0] || []).map(String);
          rows = jsonData.slice(1).map(row => (row || []).map(String));
        }
      } else {
        // CSV parsing
        const conteudo = await arquivo.text();
        const parsed = parseCsvTexto(conteudo);
        headers = parsed.headers;
        rows = parsed.rows;
      }

      if (headers.length === 0) {
        setCsvErro("Arquivo vazio ou inválido.");
        setCsvDados(null);
        return;
      }

      // Check row limit
      if (rows.length > 10000) {
        setCsvErro(`Limite máximo de 10.000 contatos. Seu arquivo tem ${rows.length} linhas.`);
        setCsvDados(null);
        return;
      }

      let mapping = detectarMapeamentoCsv(headers);
      const temMapping = Object.values(mapping).some(
        (valor) => valor !== undefined
      );
      const pareceDados = headers.some((valor) => /@|\d/.test(valor));

      let headersNormalizados = headers;
      let rowsNormalizados = rows;

      if (!temMapping && pareceDados) {
        rowsNormalizados = [headers, ...rows];
        headersNormalizados = ["Nome", "Telefone", "Email", "Empresa"];
        mapping = { nome: 0, telefone: 1, email: 2, empresa: 3 };
      }

      setCsvDados({
        headers: headersNormalizados,
        rows: rowsNormalizados,
        mapping,
      });

      if (mapping.nome === undefined) {
        setCsvErro(
          "Não foi possível encontrar a coluna Nome. Use cabeçalhos como Nome, Telefone, Email, Empresa."
        );
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setCsvErro("Erro ao processar o arquivo. Verifique se o formato está correto.");
      setCsvDados(null);
    }
  };

  const handleSelecionarArquivoCsv = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    await processarArquivoImportacao(arquivo);
    event.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const arquivo = e.dataTransfer.files?.[0];
    if (arquivo && (arquivo.name.endsWith('.csv') || arquivo.name.endsWith('.xlsx') || arquivo.name.endsWith('.xls'))) {
      await processarArquivoImportacao(arquivo);
    } else {
      setCsvErro("Por favor, envie um arquivo CSV ou Excel válido.");
    }
  };

  const handleImportarCsv = async () => {
    if (!csvDados || !workspaceId || !session) return;

    const { mapping, rows } = csvDados;
    if (mapping.nome === undefined) {
      setCsvErro(
        "Não foi possível importar porque a coluna Nome não foi encontrada."
      );
      return;
    }

    const contatosParaImportar = rows
      .map((linha) => {
        const nome = linha[mapping.nome ?? 0]?.trim() ?? "";
        const telefone =
          mapping.telefone !== undefined
            ? linha[mapping.telefone]?.trim() ?? ""
            : "";
        const email =
          mapping.email !== undefined
            ? linha[mapping.email]?.trim() ?? ""
            : "";
        const empresa =
          mapping.empresa !== undefined
            ? linha[mapping.empresa]?.trim() ?? ""
            : "";

        return {
          nome,
          telefone,
          email,
          empresa,
        };
      })
      .filter((linha) => linha.nome);

    if (contatosParaImportar.length === 0) {
      setCsvErro("Nenhum contato válido encontrado.");
      return;
    }

    setCsvImportando(true);
    setCsvErro(null);
    setCsvResumo(null);

    try {
      const token = await obterToken();
      if (!token) {
        setCsvErro("Sessão expirada. Faça login novamente.");
        setCsvImportando(false);
        return;
      }

      const response = await fetch("/api/contacts/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contacts: contatosParaImportar,
          fileName: csvArquivo?.name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setCsvErro(result.error || "Erro ao importar contatos.");
        setCsvImportando(false);
        return;
      }

      await carregarContatos();

      setCsvImportando(false);
      setCsvResumo(
        `Importação concluída: ${result.imported} contatos adicionados, ${result.errors} ignorados.`
      );

      if (result.errors === 0) {
        setDialogImportarAberto(false);
      }
    } catch (error) {
      console.error("Erro na importação:", error);
      setCsvErro("Erro ao processar a importação. Tente novamente.");
      setCsvImportando(false);
    }
  };

  const handleAbrirNovoContato = () => {
    setNovoContato({
      nome: "",
      telefone: "",
      email: "",
      empresa: "",
      pipelineId: pipelines[0]?.id ?? "",
      stageId: pipelines[0]?.etapas[0]?.id ?? "",
      owner: session?.user.id ?? OWNER_SEM,
    });
    setTagsSelecionadas([]);
    setTagInput("");
    setDialogNovoContatoAberto(true);
  };

  const handleCriarContato = async () => {
    if (
      !novoContato.nome.trim() ||
      !novoContato.telefone.trim() ||
      !workspaceId
    )
      return;

    // Pipeline/Stage is now optional
    /*
    if (!novoContato.pipelineId || !novoContato.stageId) {
      setErroDados("Selecione a pipeline e o estágio.");
      return;
    }
    */

    setCarregando(true);
    setErroDados(null);

    const nomeEmpresa = novoContato.empresa.trim();

    const ownerId =
      novoContato.owner === OWNER_SEM ? null : novoContato.owner || null;

    const telefoneNormalizado = apenasNumeros(novoContato.telefone);

    // Lookup avatar from leads by phone number
    let avatarUrl: string | null = null;
    if (telefoneNormalizado) {
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

    const { data: contatoCriado, error: contatoErro } = await supabaseClient
      .from("contacts")
      .insert({
        workspace_id: workspaceId,
        nome: novoContato.nome.trim(),
        telefone: telefoneNormalizado,
        email: novoContato.email.trim() || null,
        status: "novo",
        owner_id: ownerId,
        empresa: nomeEmpresa || null,
        pipeline_id:
          novoContato.pipelineId && novoContato.pipelineId !== "sem_pipeline"
            ? novoContato.pipelineId
            : null,
        pipeline_stage_id:
          novoContato.stageId && novoContato.pipelineId !== "sem_pipeline"
            ? novoContato.stageId
            : null,
        avatar_url: avatarUrl,
      })
      .select("id")
      .single();

    if (contatoErro || !contatoCriado) {
      setErroDados("Falha ao criar contato.");
      setCarregando(false);
      return;
    }

    if (tagsSelecionadas.length > 0) {
      const tagIds: string[] = [];

      for (const tag of tagsSelecionadas) {
        if (tag.id) {
          tagIds.push(tag.id);
          continue;
        }

        const { data: tagCriada } = await supabaseClient
          .from("tags")
          .insert({
            workspace_id: workspaceId,
            nome: tag.nome,
            cor: tag.cor,
          })
          .select("id")
          .single();

        if (tagCriada?.id) {
          tagIds.push(tagCriada.id);
        }
      }

      if (tagIds.length > 0) {
        const payload = tagIds.map((tagId) => ({
          workspace_id: workspaceId,
          contact_id: contatoCriado.id,
          tag_id: tagId,
        }));

        await supabaseClient.from("contact_tags").upsert(payload, {
          onConflict: "contact_id,tag_id",
        });
      }
    }

    await registrarAuditoria({
      contatoId: contatoCriado.id,
      acao: "Contato criado",
      detalhes: { mensagem: "Contato criado manualmente." },
    });

    await carregarContatos();
    await carregarTagsExistentes();
    setDialogNovoContatoAberto(false);
    setCarregando(false);
  };

  const handleAbrirEditarContato = () => {
    if (!contatoAtivo) return;
    const pipelinePadrao =
      pipelines.find((pipeline) => pipeline.id === contatoAtivo.pipelineId) ??
      pipelines[0];
    const stagePadrao =
      pipelinePadrao?.etapas.find((etapa) => etapa.id === contatoAtivo.pipelineStageId)
        ?.id ?? pipelinePadrao?.etapas[0]?.id ?? "";

    setFormEditarContato({
      nome: contatoAtivo.nome,
      telefone: formatarTelefone(contatoAtivo.telefone),
      email: contatoAtivo.email,
      empresa: contatoAtivo.empresa ?? "",
      status: contatoAtivo.status,
      pipelineId: pipelinePadrao?.id ?? "",
      stageId: stagePadrao,
      owner: contatoAtivo.ownerId ?? OWNER_SEM,
    });
    setTagsEditadas(
      contatoAtivo.tags.map((tag) => {
        const existente = tagsExistentes.find(
          (item) => item.nome.toLowerCase() === tag.toLowerCase()
        );
        return {
          id: existente?.id,
          nome: tag,
          cor: existente?.cor ?? gerarCorTag(),
        };
      })
    );
    setTagEditarInput("");
    setDialogEditarContatoAberto(true);
  };

  const handleSalvarContatoEditado = async () => {
    if (!contatoAtivo || !workspaceId) return;
    const nome = formEditarContato.nome.trim();
    if (!nome) return;

    setErroDados(null);

    const nomeEmpresa = formEditarContato.empresa.trim();
    const tagsAntes = contatoAtivo.tags;
    const tagsDepois = tagsEditadas.map((tag) => tag.nome);

    const ownerId =
      formEditarContato.owner === OWNER_SEM ? null : formEditarContato.owner;
    const telefoneNormalizado = apenasNumeros(formEditarContato.telefone);

    const { error } = await supabaseClient
      .from("contacts")
      .update({
        nome,
        telefone: telefoneNormalizado,
        email: formEditarContato.email.trim() || null,
        status: formEditarContato.status,
        owner_id: ownerId,
        empresa: nomeEmpresa || null,
        pipeline_id: formEditarContato.pipelineId || null,
        pipeline_stage_id: formEditarContato.stageId || null,
      })
      .eq("id", contatoAtivo.id)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Falha ao atualizar o contato.");
      return;
    }

    const tagsAntesNormalizados = new Set(tagsAntes.map(normalizarTexto));
    const tagsDepoisNormalizados = new Set(tagsDepois.map(normalizarTexto));
    const tagsParaAdicionar = tagsEditadas.filter(
      (tag) => !tagsAntesNormalizados.has(normalizarTexto(tag.nome))
    );
    const tagsParaRemover = tagsAntes.filter(
      (tag) => !tagsDepoisNormalizados.has(normalizarTexto(tag))
    );

    const tagIdPorNome = new Map<string, string>();
    tagsExistentes.forEach((tag) => {
      tagIdPorNome.set(normalizarTexto(tag.nome), tag.id);
    });

    for (const tag of tagsParaAdicionar) {
      if (tag.id) {
        tagIdPorNome.set(normalizarTexto(tag.nome), tag.id);
        continue;
      }

      const { data: tagCriada } = await supabaseClient
        .from("tags")
        .insert({
          workspace_id: workspaceId,
          nome: tag.nome,
          cor: tag.cor,
        })
        .select("id")
        .single();

      if (tagCriada?.id) {
        tagIdPorNome.set(normalizarTexto(tag.nome), tagCriada.id);
      }
    }

    const tagIdsAdicionar = tagsParaAdicionar
      .map((tag) => tagIdPorNome.get(normalizarTexto(tag.nome)))
      .filter(Boolean) as string[];

    if (tagIdsAdicionar.length > 0) {
      const payload = tagIdsAdicionar.map((tagId) => ({
        workspace_id: workspaceId,
        contact_id: contatoAtivo.id,
        tag_id: tagId,
      }));

      await supabaseClient.from("contact_tags").upsert(payload, {
        onConflict: "contact_id,tag_id",
      });
    }

    const tagIdsRemover = tagsParaRemover
      .map((tag) => tagIdPorNome.get(normalizarTexto(tag)))
      .filter(Boolean) as string[];

    if (tagIdsRemover.length > 0) {
      await supabaseClient
        .from("contact_tags")
        .delete()
        .eq("contact_id", contatoAtivo.id)
        .in("tag_id", tagIdsRemover);
    }

    if (tagsParaAdicionar.length > 0 || tagsParaRemover.length > 0) {
      await carregarTagsExistentes();
    }

    setContatoAtivo((atual) =>
      atual
        ? {
          ...atual,
          nome,
          telefone: telefoneNormalizado,
          email: formEditarContato.email.trim(),
          empresa: nomeEmpresa || undefined,
          status: formEditarContato.status,
          owner: labelOwner(ownerId),
          ownerId: ownerId ?? undefined,
          pipelineId: formEditarContato.pipelineId || undefined,
          pipelineStageId: formEditarContato.stageId || undefined,
          tags: tagsDepois,
        }
        : atual
    );

    setContatos((atual) =>
      atual.map((contato) =>
        contato.id === contatoAtivo.id
          ? {
            ...contato,
            nome,
            telefone: telefoneNormalizado,
            email: formEditarContato.email.trim(),
            empresa: nomeEmpresa || undefined,
            status: formEditarContato.status,
            owner: labelOwner(ownerId),
            ownerId: ownerId ?? undefined,
            pipelineId: formEditarContato.pipelineId || undefined,
            pipelineStageId: formEditarContato.stageId || undefined,
            tags: tagsDepois,
          }
          : contato
      )
    );

    const camposAlterados: string[] = [];
    if (contatoAtivo.nome !== nome) camposAlterados.push("Nome");
    if (contatoAtivo.telefone !== telefoneNormalizado) {
      camposAlterados.push("Telefone");
    }
    if ((contatoAtivo.email ?? "") !== formEditarContato.email.trim()) {
      camposAlterados.push("Email");
    }
    if ((contatoAtivo.empresa ?? "") !== nomeEmpresa) {
      camposAlterados.push("Empresa");
    }
    if (contatoAtivo.status !== formEditarContato.status) {
      camposAlterados.push("Status");
    }
    if ((contatoAtivo.ownerId ?? OWNER_SEM) !== (ownerId ?? OWNER_SEM)) {
      camposAlterados.push("Owner");
    }
    if ((contatoAtivo.pipelineId ?? "") !== formEditarContato.pipelineId) {
      camposAlterados.push("Pipeline");
    }
    if ((contatoAtivo.pipelineStageId ?? "") !== formEditarContato.stageId) {
      camposAlterados.push("Estágio");
    }
    if (tagsParaAdicionar.length > 0 || tagsParaRemover.length > 0) {
      camposAlterados.push("Tags");
    }

    if (camposAlterados.length > 0) {
      await registrarAuditoria({
        contatoId: contatoAtivo.id,
        acao: "Contato atualizado",
        detalhes: { campos: camposAlterados },
      });
    }

    setDialogEditarContatoAberto(false);
  };

  const handleAtualizarOwnerContato = async (owner: string) => {
    if (!contatoAtivo || !workspaceId) return;
    const ownerId = owner === OWNER_SEM ? null : owner;

    const { error } = await supabaseClient
      .from("contacts")
      .update({ owner_id: ownerId })
      .eq("id", contatoAtivo.id)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Não foi possível atualizar o responsável.");
      return;
    }

    await registrarAuditoria({
      contatoId: contatoAtivo.id,
      acao: "Owner atualizado",
      detalhes: { mensagem: `Owner definido para ${labelOwner(ownerId)}.` },
    });

    setContatoAtivo((atual) =>
      atual
        ? {
          ...atual,
          owner: labelOwner(ownerId),
          ownerId: ownerId ?? undefined,
        }
        : atual
    );
    setContatos((atual) =>
      atual.map((contato) =>
        contato.id === contatoAtivo.id
          ? {
            ...contato,
            owner: labelOwner(ownerId),
            ownerId: ownerId ?? undefined,
          }
          : contato
      )
    );
  };

  const handleAdicionarNota = async () => {
    if (!notaAtual.trim() || !contatoAtivo || !workspaceId || !session) {
      return;
    }

    setEnviandoNota(true);
    const { data, error } = await supabaseClient
      .from("contact_notes")
      .insert({
        workspace_id: workspaceId,
        contact_id: contatoAtivo.id,
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

    setNotasContato((atual) => [data, ...atual]);
    await registrarAuditoria({
      contatoId: contatoAtivo.id,
      acao: "Nota adicionada",
      detalhes: { mensagem: "Nota interna adicionada." },
    });
    setNotaAtual("");
    setEnviandoNota(false);
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
      !contatoAtivo
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

    setNotasContato((atual) =>
      atual.map((nota) =>
        nota.id === notaEditandoId
          ? { ...nota, conteudo: notaEditandoConteudo.trim() }
          : nota
      )
    );

    await registrarAuditoria({
      contatoId: contatoAtivo.id,
      acao: "Nota editada",
      detalhes: { mensagem: "Nota interna atualizada." },
    });

    handleCancelarEdicaoNota();
  };

  const handleExcluirNota = async (notaId: string) => {
    if (!contatoAtivo || !workspaceId) return;

    const { error } = await supabaseClient
      .from("contact_notes")
      .delete()
      .eq("id", notaId)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Não foi possível excluir a nota.");
      return;
    }

    setNotasContato((atual) => atual.filter((nota) => nota.id !== notaId));
    if (notaEditandoId === notaId) {
      handleCancelarEdicaoNota();
    }

    await registrarAuditoria({
      contatoId: contatoAtivo.id,
      acao: "Nota removida",
      detalhes: { mensagem: "Nota interna removida." },
    });
  };

  const handleSelecionarArquivo = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo || !contatoAtivo || !workspaceId || !session) {
      return;
    }

    setEnviandoArquivo(true);

    const nomeSeguro = arquivo.name.replace(/[^\w.-]/g, "_");
    const caminho = `${workspaceId}/${contatoAtivo.id}/${Date.now()}-${nomeSeguro}`;

    const token = await obterToken();
    if (!token) {
      setErroDados("Sessão expirada.");
      setEnviandoArquivo(false);
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
      setEnviandoArquivo(false);
      event.target.value = "";
      return;
    }

    const { data: registro, error: registroErro } = await supabaseClient
      .from("contact_files")
      .insert({
        workspace_id: workspaceId,
        contact_id: contatoAtivo.id,
        autor_id: session.user.id,
        storage_path: caminho,
        file_name: arquivo.name,
        mime_type: arquivo.type || null,
        tamanho_bytes: arquivo.size,
      })
      .select(
        "id, storage_path, file_name, mime_type, tamanho_bytes, created_at"
      )
      .single();

    if (registroErro || !registro) {
      setErroDados("Não foi possível registrar o arquivo.");
      setEnviandoArquivo(false);
      event.target.value = "";
      return;
    }

    const publicUrl = buildR2PublicUrl("contact-files", caminho);

    setArquivosContato((atual) => [
      { ...registro, publicUrl: publicUrl ?? undefined },
      ...atual,
    ]);
    await registrarAuditoria({
      contatoId: contatoAtivo.id,
      acao: "Arquivo enviado",
      detalhes: { mensagem: `Arquivo ${arquivo.name} enviado.` },
    });
    setEnviandoArquivo(false);
    event.target.value = "";
  };

  const handleExcluirArquivo = async (arquivo: ArquivoContato) => {
    if (!contatoAtivo || !workspaceId) return;

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

    setArquivosContato((atual) =>
      atual.filter((item) => item.id !== arquivo.id)
    );

    await registrarAuditoria({
      contatoId: contatoAtivo.id,
      acao: "Arquivo removido",
      detalhes: { mensagem: `Arquivo ${arquivo.file_name} removido.` },
    });

    setArquivoExcluindoId(null);
  };

  const handleSelecionarAvatar = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo || !contatoAtivo || !workspaceId || !session) {
      return;
    }

    setEnviandoAvatar(true);

    const extensao = arquivo.name.split(".").pop() ?? "png";
    const caminho = `${workspaceId}/${contatoAtivo.id}/${Date.now()}.${extensao}`;

    const token = await obterToken();
    if (!token) {
      setErroDados("Sessão expirada.");
      setEnviandoAvatar(false);
      event.target.value = "";
      return;
    }

    try {
      await uploadFileToR2({
        token,
        bucket: "contact-avatars",
        key: caminho,
        file: arquivo,
      });
    } catch (error) {
      setErroDados("Não foi possível atualizar a foto.");
      setEnviandoAvatar(false);
      event.target.value = "";
      return;
    }

    const publicUrl = buildR2PublicUrl("contact-avatars", caminho);
    if (!publicUrl) {
      setErroDados("Não foi possível gerar a URL da foto.");
      setEnviandoAvatar(false);
      event.target.value = "";
      return;
    }

    const { error } = await supabaseClient
      .from("contacts")
      .update({ avatar_url: publicUrl })
      .eq("id", contatoAtivo.id)
      .eq("workspace_id", workspaceId);

    if (error) {
      setErroDados("Não foi possível salvar a foto.");
      setEnviandoAvatar(false);
      event.target.value = "";
      return;
    }

    setContatoAtivo((atual) =>
      atual ? { ...atual, avatarUrl: publicUrl } : atual
    );
    setContatos((atual) =>
      atual.map((contato) =>
        contato.id === contatoAtivo.id
          ? { ...contato, avatarUrl: publicUrl }
          : contato
      )
    );
    await registrarAuditoria({
      contatoId: contatoAtivo.id,
      acao: "Foto atualizada",
      detalhes: { mensagem: "Foto do contato atualizada." },
    });
    setEnviandoAvatar(false);
    event.target.value = "";
  };

  if (!session) {
    return null;
  }

  const exibirTelefone = (telefone: string) =>
    podeVer ? formatarTelefone(telefone) : mascararTelefone(telefone);
  const exibirEmail = (email: string) =>
    podeVer ? email : mascararEmail(email);
  const exibirSkeleton = carregando;
  const previewCsvRows = csvDados?.rows.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Contatos</h1>
          <p className="text-sm text-muted-foreground">
            Todos os contatos adicionados ao CRM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 rounded-[6px] shadow-none"
            onClick={() => setDialogImportarAberto(true)}
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button
            className="gap-2 rounded-[6px] shadow-none"
            onClick={handleAbrirNovoContato}
          >
            <UserPlus className="h-4 w-4" />
            Novo contato
          </Button>
        </div>
      </div>
      {erroDados && (
        <p className="text-xs text-destructive">{erroDados}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, telefone, email ou empresa"
            className="pl-9 rounded-[6px] shadow-none"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 rounded-[6px] shadow-none"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtrar
              {filtroAtivoCount > 0 && (
                <Badge variant="secondary" className="ml-1 rounded-[6px]">
                  {filtroAtivoCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64 rounded-[6px] shadow-none"
          >
            <DropdownMenuLabel>Filtros de contatos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-[6px]">
                  Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 rounded-[6px] shadow-none">
                  <DropdownMenuRadioGroup
                    value={filtroStatus}
                    onValueChange={(valor) =>
                      setFiltroStatus(valor as StatusContato | "todos")
                    }
                  >
                    <DropdownMenuRadioItem value="todos" className="rounded-[6px]">
                      Todos os status
                    </DropdownMenuRadioItem>
                    {Object.entries(statusLabel).map(([valor, label]) => (
                      <DropdownMenuRadioItem
                        key={valor}
                        value={valor}
                        className="rounded-[6px]"
                      >
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-[6px]">
                  Owner
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 rounded-[6px] shadow-none">
                  <DropdownMenuRadioGroup
                    value={filtroOwner}
                    onValueChange={setFiltroOwner}
                  >
                    {owners.map((owner) => (
                      <DropdownMenuRadioItem
                        key={owner}
                        value={owner}
                        className="rounded-[6px]"
                      >
                        {owner === "todos"
                          ? "Todos os owners"
                          : owner === OWNER_SEM
                            ? "Sem owner"
                            : labelOwner(owner)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-[6px]">
                  Tags
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 rounded-[6px] shadow-none">
                  <DropdownMenuRadioGroup
                    value={filtroTag}
                    onValueChange={setFiltroTag}
                  >
                    {tags.map((tag) => (
                      <DropdownMenuRadioItem
                        key={tag}
                        value={tag}
                        className="rounded-[6px]"
                      >
                        {tag === "todas" ? "Todas as tags" : tag}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-[6px]">
                  Outros
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 rounded-[6px] shadow-none">
                  <DropdownMenuCheckboxItem
                    checked={filtroSomenteComEmpresa}
                    onCheckedChange={(valor) =>
                      setFiltroSomenteComEmpresa(Boolean(valor))
                    }
                    className="rounded-[6px]"
                  >
                    Somente com empresa
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroSomenteComTags}
                    onCheckedChange={(valor) =>
                      setFiltroSomenteComTags(Boolean(valor))
                    }
                    className="rounded-[6px]"
                  >
                    Somente com tags
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLimparFiltros}
              className="rounded-[6px]"
            >
              Limpar filtros
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-card/40 p-3">
        {selecionados.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-[6px]">
              {selecionados.length} selecionados
            </Badge>
            <Select onValueChange={handleAplicarTag}>
              <SelectTrigger className="w-[170px] rounded-[6px] shadow-none">
                <SelectValue placeholder="Aplicar tag" />
              </SelectTrigger>
              <SelectContent className="rounded-[6px] shadow-none">
                {tags
                  .filter((tag) => tag !== "todas")
                  .map((tag) => (
                    <SelectItem key={tag} value={tag} className="rounded-[6px]">
                      {tag}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleAplicarStatus}>
              <SelectTrigger className="w-[170px] rounded-[6px] shadow-none">
                <SelectValue placeholder="Alterar status" />
              </SelectTrigger>
              <SelectContent className="rounded-[6px] shadow-none">
                {Object.entries(statusLabel).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor} className="rounded-[6px]">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleAplicarOwner}>
              <SelectTrigger className="w-[170px] rounded-[6px] shadow-none">
                <SelectValue placeholder="Alterar owner" />
              </SelectTrigger>
              <SelectContent className="rounded-[6px] shadow-none">
                {owners
                  .filter((owner) => owner !== "todos")
                  .map((owner) => (
                    <SelectItem key={owner} value={owner} className="rounded-[6px]">
                      {owner === OWNER_SEM ? "Sem owner" : labelOwner(owner)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="gap-2 rounded-[6px] shadow-none"
              onClick={() => setDialogExportarAberto(true)}
            >
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              variant="destructive"
              className="rounded-[6px] shadow-none"
              onClick={() => setDialogExcluirAberto(true)}
            >
              Excluir
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Selecione contatos para aplicar tags, status, owner ou exportar.
          </p>
        )}
      </div>

      <div className="rounded-[6px] border border-border/60 bg-card/40">
        <div
          className="max-h-[calc(100vh-360px)] overflow-auto"
          onScroll={handleScroll}
        >
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[36px_minmax(180px,1.4fr)_minmax(140px,1fr)_minmax(200px,1.4fr)_minmax(120px,0.9fr)_minmax(180px,1.2fr)_minmax(140px,0.9fr)_minmax(180px,1.2fr)_minmax(120px,0.8fr)] items-center gap-3 border-b border-border/60 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              <Checkbox
                checked={
                  todosSelecionados ? true : algumSelecionado ? "indeterminate" : false
                }
                onCheckedChange={(valor) => handleSelecionarTodos(Boolean(valor))}
                aria-label="Selecionar todos os contatos visíveis"
                className="rounded-[6px] shadow-none"
              />
              <span>Nome</span>
              <span>Telefone</span>
              <span>Email</span>
              <span>Estágio</span>
              <span>Tags</span>
              <span>Owner</span>
              <span>Empresa</span>
              <span>Última atividade</span>
            </div>
            {exibirSkeleton ? (
              <div className="space-y-3 px-4 py-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-12 w-full rounded-[6px]"
                  />
                ))}
              </div>
            ) : contatosVisiveis.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhum contato encontrado com os filtros atuais.
              </div>
            ) : (
              contatosVisiveis.map((contato) => (
                <div
                  key={contato.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setContatoAtivo(contato)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setContatoAtivo(contato);
                    }
                  }}
                  className={cn(
                    "grid grid-cols-[36px_minmax(180px,1.4fr)_minmax(140px,1fr)_minmax(200px,1.4fr)_minmax(120px,0.9fr)_minmax(180px,1.2fr)_minmax(140px,0.9fr)_minmax(180px,1.2fr)_minmax(120px,0.8fr)] items-center gap-3 border-b border-border/40 px-4 py-3 text-sm transition hover:bg-muted/40",
                    selecionados.includes(contato.id) && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={selecionados.includes(contato.id)}
                    onCheckedChange={() => handleToggleSelecionado(contato.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Selecionar contato ${contato.nome}`}
                    className="rounded-[6px] shadow-none"
                  />
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 rounded-[6px]">
                      <AvatarImage
                        src={contato.avatarUrl ?? "/avatars/contato-placeholder.svg"}
                        alt={contato.nome}
                      />
                      <AvatarFallback className="rounded-[6px]">
                        {iniciaisContato(contato.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium">{contato.nome}</p>
                    </div>
                  </div>
                  <span>{exibirTelefone(contato.telefone)}</span>
                  <span className="truncate">{exibirEmail(contato.email)}</span>
                  <Badge
                    className="rounded-[6px] text-[10px] text-white"
                    style={{ backgroundColor: obterEtapaContato(contato).cor }}
                  >
                    {obterEtapaContato(contato).nome}
                  </Badge>
                  <div className="flex flex-wrap gap-1">
                    {contato.tags.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Sem tags
                      </span>
                    ) : (
                      contato.tags.map((tag) => (
                        <Badge
                          key={tag}
                          className="rounded-[6px] text-[10px] text-white"
                          style={{ backgroundColor: corDaTag(tag) }}
                        >
                          {tag}
                        </Badge>
                      ))
                    )}
                  </div>
                  <span>{contato.owner}</span>
                  <span>{contato.empresa ?? "Sem empresa"}</span>
                  <span>{contato.ultimaAtividade}</span>
                </div>
              ))
            )}
          </div>
        </div>
        {temMais && (
          <div className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
            Carregando mais contatos conforme você rola a tabela...
          </div>
        )}
      </div>

      <Dialog open={dialogExcluirAberto} onOpenChange={setDialogExcluirAberto}>
        <DialogContent className="rounded-[6px] shadow-none">
          <DialogHeader>
            <DialogTitle>Excluir contatos selecionados?</DialogTitle>
            <DialogDescription>
              Esta ação remove os contatos do CRM e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-[6px] shadow-none"
              onClick={() => setDialogExcluirAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="rounded-[6px] shadow-none"
              onClick={handleExcluirSelecionados}
            >
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogExcluirContatoAberto} onOpenChange={setDialogExcluirContatoAberto}>
        <DialogContent className="rounded-[6px] shadow-none">
          <DialogHeader>
            <DialogTitle>Excluir contato?</DialogTitle>
            <DialogDescription>
              Esta ação irá excluir permanentemente o contato{" "}
              <strong>{contatoAtivo?.nome}</strong> e todos os seus dados
              associados. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-[6px] shadow-none"
              onClick={() => setDialogExcluirContatoAberto(false)}
              disabled={excluindoContato}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="rounded-[6px] shadow-none"
              onClick={handleExcluirContatoAtivo}
              disabled={excluindoContato}
            >
              {excluindoContato ? "Excluindo..." : "Excluir contato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogExportarAberto} onOpenChange={setDialogExportarAberto}>
        <DialogContent className="rounded-[6px] shadow-none">
          <DialogHeader>
            <DialogTitle>Exportar contatos</DialogTitle>
            <DialogDescription>
              Gere um CSV com os contatos selecionados para compartilhar.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            {selecionados.length > 0
              ? `${selecionados.length} contatos selecionados para exportação.`
              : `${contatosFiltrados.length} contatos serão exportados.`}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-[6px] shadow-none"
              onClick={() => setDialogExportarAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-[6px] shadow-none"
              onClick={() => {
                // Get contacts to export
                const contatosParaExportar = selecionados.length > 0
                  ? contatos.filter((c) => selecionados.includes(c.id))
                  : contatosFiltrados;

                // Build CSV content
                const headers = ["Nome", "Telefone", "Email", "Empresa", "Status", "Tags"];
                const rows = contatosParaExportar.map((c) => [
                  c.nome,
                  c.telefone,
                  c.email,
                  c.empresa || "",
                  c.status,
                  c.tags.join("; "),
                ]);

                const csvContent = [
                  headers.join(","),
                  ...rows.map((row) =>
                    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                  ),
                ].join("\n");

                // Create and download file
                const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `contatos_${new Date().toISOString().split("T")[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                setDialogExportarAberto(false);
              }}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Baixar CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogImportarAberto}
        onOpenChange={(aberto) => {
          setDialogImportarAberto(aberto);
          if (!aberto) {
            setCsvArquivo(null);
            setCsvDados(null);
            setCsvErro(null);
            setCsvResumo(null);
            setCsvImportando(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl rounded-[6px] shadow-none">
          <DialogHeader>
            <DialogTitle>Importar contatos via CSV ou Excel</DialogTitle>
            <DialogDescription>
              Envie o arquivo CSV ou Excel (.xlsx) e revise a pré-visualização antes de importar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div
              className={cn(
                "rounded-[6px] border border-dashed border-border/70 bg-card/40 p-8 transition-colors duration-200",
                isDragging && "border-primary bg-primary/5 scale-[1.01]"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                id="importar-csv"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleSelecionarArquivoCsv}
              />
              <label
                htmlFor="importar-csv"
                className="flex flex-col items-center justify-center gap-4 cursor-pointer"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className={cn(
                    "rounded-full p-3 transition-colors duration-200",
                    isDragging ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                  )}>
                    <Upload className={cn("h-6 w-6", isDragging && "scale-110")} />
                  </span>
                  <div className="space-y-1">
                    <p className="text-base font-medium">
                      {isDragging ? "Solte o arquivo para enviar" : "Arraste o arquivo ou clique para selecionar"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Formatos: CSV, XLSX. Máx: 10.000 contatos.
                    </p>
                  </div>
                </div>
                {!isDragging && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-[6px] shadow-none mt-2"
                    onClick={() => document.getElementById('importar-csv')?.click()}
                  >
                    Selecionar arquivo do computador
                  </Button>
                )}
              </label>
            </div>

            {csvArquivo && (
              <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-card/40 px-3 py-2 text-xs">
                <span className="font-medium text-foreground">
                  {csvArquivo.name}
                </span>
                <span className="text-muted-foreground">
                  {(csvArquivo.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}

            <div className="rounded-[6px] border border-border/60 bg-card/40">
              <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Pré-visualização</p>
                  <p className="text-xs text-muted-foreground">
                    Mostrando até 5 linhas detectadas no CSV.
                  </p>
                </div>
                {csvDados && (
                  <Badge variant="secondary" className="rounded-[6px]">
                    {csvDados.rows.length} linhas
                  </Badge>
                )}
              </div>
              {csvDados ? (
                <div className="max-h-56 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-card">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Nome</th>
                        <th className="px-4 py-2 font-medium">Telefone</th>
                        <th className="px-4 py-2 font-medium">Email</th>
                        <th className="px-4 py-2 font-medium">Empresa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewCsvRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-4 text-center text-muted-foreground"
                          >
                            Nenhuma linha válida encontrada.
                          </td>
                        </tr>
                      ) : (
                        previewCsvRows.map((linha, index) => (
                          <tr key={index} className="border-t border-border/40">
                            <td className="px-4 py-2">
                              {linha[csvDados.mapping.nome ?? 0] ?? "-"}
                            </td>
                            <td className="px-4 py-2">
                              {csvDados.mapping.telefone !== undefined
                                ? linha[csvDados.mapping.telefone] ?? "-"
                                : "-"}
                            </td>
                            <td className="px-4 py-2">
                              {csvDados.mapping.email !== undefined
                                ? linha[csvDados.mapping.email] ?? "-"
                                : "-"}
                            </td>
                            <td className="px-4 py-2">
                              {csvDados.mapping.empresa !== undefined
                                ? linha[csvDados.mapping.empresa] ?? "-"
                                : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-6 text-xs text-muted-foreground">
                  Envie um arquivo CSV para visualizar os dados antes de importar.
                </div>
              )}
            </div>

            {csvErro && (
              <div className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {csvErro}
              </div>
            )}
            {csvResumo && (
              <div className="rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {csvResumo}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-[6px] shadow-none"
              onClick={() => setDialogImportarAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-[6px] shadow-none"
              onClick={handleImportarCsv}
              disabled={
                !csvDados ||
                csvImportando ||
                csvDados.mapping.nome === undefined ||
                csvDados.rows.length === 0
              }
            >
              {csvImportando ? "Importando..." : "Confirmar importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogNovoContatoAberto}
        onOpenChange={setDialogNovoContatoAberto}
      >
        <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0 w-full max-w-md rounded-[6px] shadow-none bg-white dark:bg-slate-950">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle>Novo contato</DialogTitle>
            <DialogDescription>
              Adicione um contato manualmente ao CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="contato-nome" className="text-sm font-medium">
                Nome completo
              </label>
              <Input
                id="contato-nome"
                value={novoContato.nome}
                onChange={(event) =>
                  setNovoContato((atual) => ({
                    ...atual,
                    nome: event.target.value,
                  }))
                }
                placeholder="Ex: Ana Carvalho"
                className="rounded-[6px] shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-telefone" className="text-sm font-medium">
                Telefone
              </label>
              <Input
                id="contato-telefone"
                value={novoContato.telefone}
                onChange={(event) =>
                  setNovoContato((atual) => ({
                    ...atual,
                    telefone: formatarTelefone(event.target.value),
                  }))
                }
                placeholder="(11) 9.9999-9999"
                className="rounded-[6px] shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="contato-email"
                value={novoContato.email}
                onChange={(event) =>
                  setNovoContato((atual) => ({
                    ...atual,
                    email: event.target.value,
                  }))
                }
                placeholder="email@empresa.com"
                className="rounded-[6px] shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="contato-empresa" className="text-sm font-medium">
                Empresa
              </label>
              <Input
                id="contato-empresa"
                value={novoContato.empresa}
                onChange={(event) =>
                  setNovoContato((atual) => ({
                    ...atual,
                    empresa: event.target.value,
                  }))
                }
                placeholder="Nome da empresa"
                className="rounded-[6px] shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Pipeline (Opcional)</label>
              <Select
                value={novoContato.pipelineId}
                onValueChange={handleSelecionarPipeline}
                disabled={carregandoPipelines}
              >
                <SelectTrigger className="rounded-[6px] shadow-none">
                  <SelectValue placeholder="Selecione a pipeline" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none">
                  <SelectItem value="sem_pipeline" className="text-muted-foreground font-medium">
                    Sem pipeline
                  </SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem
                      key={pipeline.id}
                      value={pipeline.id}
                      className="rounded-[6px]"
                    >
                      {pipeline.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Estágio</label>
              <Select
                value={novoContato.stageId}
                onValueChange={(valor) =>
                  setNovoContato((atual) => ({ ...atual, stageId: valor }))
                }
                disabled={etapasDisponiveis.length === 0}
              >
                <SelectTrigger className="rounded-[6px] shadow-none">
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none">
                  {etapasDisponiveis.map((etapa) => (
                    <SelectItem
                      key={etapa.id}
                      value={etapa.id}
                      className="rounded-[6px]"
                    >
                      {etapa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Owner</label>
              <Select
                value={novoContato.owner}
                onValueChange={(owner) =>
                  setNovoContato((atual) => ({ ...atual, owner }))
                }
              >
                <SelectTrigger className="rounded-[6px] shadow-none">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none">
                  {owners
                    .filter((owner) => owner !== "todos")
                    .map((owner) => (
                      <SelectItem
                        key={owner}
                        value={owner}
                        className="rounded-[6px]"
                      >
                        {owner === OWNER_SEM ? "Sem owner" : labelOwner(owner)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tagsSelecionadas.map((tag) => (
                  <Badge
                    key={tag.nome}
                    variant="outline"
                    className="text-white pl-2.5 pr-1.5 py-1 text-xs font-medium border-transparent transition-colors flex items-center gap-1.5 shadow-none rounded-[6px]"
                    style={{
                      backgroundColor: tag.cor ?? "#94a3b8",
                      borderColor: (tag.cor ?? "#94a3b8") + "30",
                    }}
                  >
                    {tag.nome}
                    <button
                      type="button"
                      onClick={() => removerTagSelecionada(tag.nome)}
                      className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nova tag"
                    className="h-7 text-xs w-[120px] rounded-[6px] shadow-none"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (tagInput.trim()) {
                          void adicionarTagSelecionada(tagInput);
                          setTagInput("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-dashed gap-1.5 px-3 text-muted-foreground hover:text-foreground hover:border-slate-300 shadow-none rounded-[6px]"
                    onClick={() => {
                      if (tagInput.trim()) {
                        void adicionarTagSelecionada(tagInput);
                        setTagInput("");
                      }
                    }}
                  >
                    + Adicionar
                  </Button>
                </div>
              </div>

              {tagsDisponiveisCriacao.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 rounded-[6px] border border-border/60 bg-muted/30 p-2">
                  {tagsDisponiveisCriacao.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => void adicionarTagSelecionada(tag.nome)}
                      className="rounded-[6px] px-2 py-1 text-xs text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: tag.cor ?? "#94a3b8" }}
                    >
                      {tag.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button
              variant="ghost"
              className="rounded-[6px] shadow-none"
              onClick={() => setDialogNovoContatoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-[6px] shadow-none"
              onClick={handleCriarContato}
            >
              Salvar contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(contatoAtivo)}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setContatoAtivo(null);
            setDialogEditarContatoAberto(false);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col gap-0 border-l bg-white dark:bg-slate-950 shadow-none">
          {contatoAtivo && (
            <>
              {/* HEADER: Modern, Clean, High Hierarchy */}
              <div className="flex-none px-6 py-5 border-b border-border/60 bg-white dark:bg-slate-950 z-10">
                <SheetHeader className="sr-only">
                  <SheetTitle>Detalhes do contato</SheetTitle>
                </SheetHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-14 w-14 border-2 border-slate-100 dark:border-slate-800">
                        <AvatarImage
                          src={contatoAtivo.avatarUrl ?? "/avatars/contato-placeholder.svg"}
                          alt={contatoAtivo.nome}
                        />
                        <AvatarFallback className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 font-semibold text-lg">
                          {iniciaisContato(contatoAtivo.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full shadow-none border border-slate-200 dark:border-slate-700"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={enviandoAvatar}
                        aria-label="Alterar foto do contato"
                      >
                        <Camera className="h-3 w-3" />
                      </Button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleSelecionarAvatar}
                      />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 line-clamp-1">
                        {contatoAtivo.nome}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {contatoAtivo.empresa ? (
                          <>
                            <Building2 className="w-3.5 h-3.5" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">{contatoAtivo.empresa}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">{exibirTelefone(contatoAtivo.telefone)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Status</p>
                    <Badge
                      className="text-white text-xs px-2.5 py-0.5 rounded-[6px] shadow-none"
                      style={{ backgroundColor: obterEtapaContato(contatoAtivo).cor }}
                    >
                      {obterEtapaContato(contatoAtivo).nome}
                    </Badge>
                  </div>
                </div>

                {/* Toolbar: Iconic & Minimal */}
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex-1 flex gap-2">
                    <Link href="/app/inbox" className="h-8">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-none rounded-[6px]">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Conversa
                      </Button>
                    </Link>
                    <Button onClick={handleAbrirEditarContato} variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-none rounded-[6px]">
                      <PencilLine className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      Editar
                    </Button>
                  </div>
                  <Button
                    onClick={() => setDialogExcluirContatoAberto(true)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 rounded-[6px] shadow-none"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* BODY: Content */}
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
                          Arquivos <span className="ml-1.5 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-600 dark:text-slate-400">{arquivosContato.length}</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* TAB: OVERVIEW */}
                    <TabsContent value="visao-geral" className="p-6 m-0 space-y-8">
                      {/* Properties Grid */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Email
                          </label>
                          <p className="text-sm text-foreground">
                            {exibirEmail(contatoAtivo.email) || "—"}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Telefone
                          </label>
                          <p className="text-sm text-foreground">
                            {exibirTelefone(contatoAtivo.telefone) || "—"}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Responsável
                          </label>
                          <Select
                            value={contatoAtivo.ownerId ?? OWNER_SEM}
                            onValueChange={handleAtualizarOwnerContato}
                          >
                            <SelectTrigger className="h-9 w-full bg-slate-50 dark:bg-slate-900 border-border/60 shadow-none rounded-[6px]">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent className="shadow-none border-border/60 rounded-[6px]">
                              {owners
                                .filter((owner) => owner !== "todos")
                                .map((owner) => (
                                  <SelectItem key={owner} value={owner} className="rounded-[6px]">
                                    {owner === OWNER_SEM ? "Sem owner" : labelOwner(owner)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Funil / Etapa
                          </label>
                          <p className="text-sm text-foreground">
                            {pipelineContato?.pipeline?.nome ?? "—"} / {pipelineContato?.etapa?.nome ?? "—"}
                          </p>
                        </div>
                      </div>

                      <Separator className="bg-border/60" />

                      {/* Tags Section */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                          Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {contatoAtivo.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-white pl-2.5 pr-1.5 py-1 text-xs font-medium border-transparent transition-colors flex items-center gap-1.5 shadow-none rounded-[6px]"
                              style={{
                                backgroundColor: corDaTag(tag),
                                borderColor: (corDaTag(tag)) + "30",
                              }}
                            >
                              {tag}
                              <button
                                onClick={() => void handleRemoverTagContato(tag)}
                                className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}

                          <div className="flex items-center gap-2">
                            <Input
                              value={novaTagContato}
                              onChange={(event) => setNovaTagContato(event.target.value)}
                              placeholder="Nova tag"
                              className="h-7 text-xs w-[120px] rounded-[6px] shadow-none"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void handleAdicionarTagContato();
                                }
                              }}
                            />
                            <Button
                              onClick={() => void handleAdicionarTagContato()}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-dashed gap-1.5 px-3 text-muted-foreground hover:text-foreground hover:border-slate-300 shadow-none rounded-[6px]"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar
                            </Button>
                          </div>
                        </div>

                        {/* Available Tags from Database */}
                        {tagsExistentes.filter(
                          (t) => !contatoAtivo.tags.some(
                            (existente) => normalizarTexto(existente) === normalizarTexto(t.nome)
                          )
                        ).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2 rounded-[6px] border border-border/60 bg-muted/30 p-2">
                              {tagsExistentes
                                .filter(
                                  (t) => !contatoAtivo.tags.some(
                                    (existente) => normalizarTexto(existente) === normalizarTexto(t.nome)
                                  )
                                )
                                .map((tag) => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => void handleAdicionarTagContato(tag.nome)}
                                    className="rounded-[6px] px-2 py-1 text-xs text-white transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: tag.cor ?? "#94a3b8" }}
                                  >
                                    {tag.nome}
                                  </button>
                                ))}
                            </div>
                          )}
                      </div>

                      <Separator className="bg-border/60" />

                      {/* Notes Section (Moved from specialized Tab) */}
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
                              onClick={handleAdicionarNota}
                              disabled={!notaAtual.trim() || enviandoNota}
                              className="h-7 text-xs shadow-none border border-transparent rounded-[6px]"
                            >
                              {enviandoNota ? "Salvando..." : "Salvar"}
                            </Button>
                          </div>
                        </div>

                        {/* Note List - Compact Chip Buttons */}
                        {notasContato.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Notas Anteriores</h4>
                            <div className="flex flex-wrap gap-2">
                              {notasContato.map((nota) => (
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

                    {/* TAB: ATIVIDADES (Timeline) */}
                    <TabsContent value="atividades" className="p-6 m-0">
                      {carregandoAuditoria ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          Carregando atividades...
                        </div>
                      ) : logsAuditoria.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          Nenhuma atividade registrada ainda.
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {logsAuditoria.map((log, i) => (
                            <div key={log.id} className="flex gap-4 group">
                              <div className="flex flex-col items-center relative">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white z-10 border-2 border-white dark:border-slate-950 shadow-none bg-slate-400">
                                  <History className="w-3.5 h-3.5" />
                                </div>
                                {i !== logsAuditoria.length - 1 && (
                                  <div className="absolute top-8 bottom-[-32px] w-[2px] bg-slate-100 dark:bg-slate-800" />
                                )}
                              </div>
                              <div className="flex-1 pb-2">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-sm font-semibold capitalize text-slate-900 dark:text-slate-100">{log.acao.replace('_', ' ')}</span>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">{formatarDataHora(log.created_at)}</span>
                                </div>
                                {formatarDetalhesAuditoria(log.detalhes) && (
                                  <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {formatarDetalhesAuditoria(log.detalhes)}
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Avatar className="w-4 h-4">
                                    <AvatarFallback className="text-[8px] bg-slate-200">
                                      {log.autor_id === session?.user.id ? "VC" : "EQ"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {log.autor_id === session?.user.id ? "Você" : "Equipe"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* TAB: FILES */}
                    <TabsContent value="arquivos" className="p-6 m-0 space-y-4">
                      {carregandoDetalhes ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          Carregando arquivos...
                        </div>
                      ) : arquivosContato.length === 0 ? (
                        <div
                          className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer group rounded-[6px] shadow-none"
                          onClick={() => arquivoInputRef.current?.click()}
                        >
                          <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 text-slate-500 border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform shadow-none">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Clique para fazer upload</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, JPG ou PNG (max 10MB)</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div
                            className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer group rounded-[6px] shadow-none mb-4"
                            onClick={() => arquivoInputRef.current?.click()}
                          >
                            <p className="text-xs font-medium text-foreground flex items-center gap-2">
                              <Upload className="w-3 h-3" /> Adicionar novo arquivo
                            </p>
                          </div>
                          {arquivosContato.map((arquivo) => (
                            <div
                              key={arquivo.id}
                              className="flex items-center justify-between rounded-[6px] border border-border/60 bg-background/80 p-3 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{arquivo.file_name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatarBytes(arquivo.tamanho_bytes)} · {formatarDataHora(arquivo.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {arquivo.publicUrl && (
                                  <Button size="sm" variant="link" className="rounded-[6px] shadow-none" asChild>
                                    <a href={arquivo.publicUrl} target="_blank" rel="noreferrer">Abrir</a>
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 rounded-[6px] shadow-none"
                                  onClick={() => handleExcluirArquivo(arquivo)}
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
                        ref={arquivoInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleSelecionarArquivo}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* FOOTER: Sticky Info Bar */}
              <div className="flex-none px-6 py-3 border-t border-border bg-white dark:bg-slate-950 flex items-center justify-between z-20 shadow-none">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                  <History className="w-3.5 h-3.5" />
                  <span>Última atividade: {contatoAtivo.ultimaAtividade}</span>
                </div>
                <Badge variant="outline" className="text-xs rounded-[6px] shadow-none">
                  {contatoAtivo.owner}
                </Badge>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={dialogEditarContatoAberto}
        onOpenChange={setDialogEditarContatoAberto}
      >
        <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0 w-full max-w-md rounded-[6px] shadow-none bg-white dark:bg-slate-950">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle>Editar contato</DialogTitle>
            <DialogDescription>
              Atualize as informações principais do contato selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="editar-contato-nome" className="text-sm font-medium">
                Nome completo
              </label>
              <Input
                id="editar-contato-nome"
                value={formEditarContato.nome}
                onChange={(event) =>
                  setFormEditarContato((atual) => ({
                    ...atual,
                    nome: event.target.value,
                  }))
                }
                className="rounded-[6px] shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="editar-contato-telefone" className="text-sm font-medium">
                Telefone
              </label>
              <Input
                id="editar-contato-telefone"
                value={formEditarContato.telefone}
                onChange={(event) =>
                  setFormEditarContato((atual) => ({
                    ...atual,
                    telefone: formatarTelefone(event.target.value),
                  }))
                }
                className="rounded-[6px] shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="editar-contato-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="editar-contato-email"
                value={formEditarContato.email}
                onChange={(event) =>
                  setFormEditarContato((atual) => ({
                    ...atual,
                    email: event.target.value,
                  }))
                }
                className="rounded-[6px] shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="editar-contato-empresa" className="text-sm font-medium">
                Empresa
              </label>
              <Input
                id="editar-contato-empresa"
                value={formEditarContato.empresa}
                onChange={(event) =>
                  setFormEditarContato((atual) => ({
                    ...atual,
                    empresa: event.target.value,
                  }))
                }
                className="rounded-[6px] shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Pipeline</label>
              <Select
                value={formEditarContato.pipelineId}
                onValueChange={(pipelineId) => {
                  const pipeline = pipelines.find(
                    (item) => item.id === pipelineId
                  );
                  setFormEditarContato((atual) => ({
                    ...atual,
                    pipelineId,
                    stageId: pipeline?.etapas[0]?.id ?? "",
                  }));
                }}
              >
                <SelectTrigger className="rounded-[6px] shadow-none">
                  <SelectValue placeholder="Selecione a pipeline" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none">
                  {pipelines.map((pipeline) => (
                    <SelectItem
                      key={pipeline.id}
                      value={pipeline.id}
                      className="rounded-[6px]"
                    >
                      {pipeline.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Estágio</label>
              <Select
                value={formEditarContato.stageId}
                onValueChange={(stageId) =>
                  setFormEditarContato((atual) => ({
                    ...atual,
                    stageId,
                  }))
                }
              >
                <SelectTrigger className="rounded-[6px] shadow-none">
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none">
                  {etapasEditar.map((etapa) => (
                    <SelectItem
                      key={etapa.id}
                      value={etapa.id}
                      className="rounded-[6px]"
                    >
                      {etapa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Owner</label>
              <Select
                value={formEditarContato.owner}
                onValueChange={(owner) =>
                  setFormEditarContato((atual) => ({ ...atual, owner }))
                }
              >
                <SelectTrigger className="rounded-[6px] shadow-none">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none">
                  {owners
                    .filter((owner) => owner !== "todos")
                    .map((owner) => (
                      <SelectItem
                        key={owner}
                        value={owner}
                        className="rounded-[6px]"
                      >
                        {owner === OWNER_SEM ? "Sem owner" : labelOwner(owner)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="editar-contato-tags" className="text-sm font-medium">
                Tags
              </label>
              {tagsEditadas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tagsEditadas.map((tag) => (
                    <Badge
                      key={tag.nome}
                      className="flex items-center gap-1 rounded-[6px] text-xs text-white"
                      style={{ backgroundColor: tag.cor }}
                    >
                      {tag.nome}
                      <button
                        type="button"
                        onClick={() => removerTagEditada(tag.nome)}
                        className="ml-1 rounded-[6px] p-0.5 text-white/80 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                id="editar-contato-tags"
                value={tagEditarInput}
                onChange={(event) => setTagEditarInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void adicionarTagEditada(tagEditarInput);
                  }
                }}
                placeholder="Digite uma tag e pressione Enter"
                className="rounded-[6px] shadow-none"
              />
              {tagsDisponiveisEdicao.length > 0 && (
                <div className="flex flex-wrap gap-2 rounded-[6px] border border-border/60 bg-muted/30 p-2">
                  {tagsDisponiveisEdicao.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => void adicionarTagEditada(tag.nome)}
                      className="rounded-[6px] px-2 py-1 text-xs text-white"
                      style={{ backgroundColor: tag.cor ?? "#94a3b8" }}
                    >
                      {tag.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button
              variant="ghost"
              className="rounded-[6px] shadow-none"
              onClick={() => setDialogEditarContatoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-[6px] shadow-none"
              onClick={handleSalvarContatoEditado}
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note View Dialog */}
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
                  if (!notaVisualizada || !contatoAtivo || !workspaceId) return;

                  const { error } = await supabaseClient
                    .from("contact_notes")
                    .delete()
                    .eq("id", notaVisualizada.id)
                    .eq("workspace_id", workspaceId);

                  if (error) {
                    console.error("Erro ao excluir nota:", error);
                    return;
                  }

                  setNotasContato(atual => atual.filter(n => n.id !== notaVisualizada.id));
                  setNotaVisualizada(null);

                  await registrarAuditoria({
                    contatoId: contatoAtivo.id,
                    acao: "nota_removida",
                    detalhes: { resumo: notaVisualizada.conteudo.substring(0, 50) },
                  });
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
    </div>
  );
}
