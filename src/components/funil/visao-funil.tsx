"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowRightLeft,
  Check,
  GripVertical,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { CanalId, DealFunil, EtapaFunil } from "@/lib/types";
import { dealsFunil, etapasFunil } from "@/lib/mock/funil";
import { formatarMoeda } from "@/lib/formatadores";
import { podeVerDadosSensiveis } from "@/lib/permissoes";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { cn } from "@/lib/utils";
import { IconeCanal } from "@/components/inbox/icone-canal";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const LIMITE_INICIAL = 8;

const slug = (valor: string) =>
  valor
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const funisDisponiveis = [
  { id: "principal", nome: "Pipeline principal" },
  { id: "expansao", nome: "Pipeline expansão" },
];

export function VisaoFunil() {
  const { usuario } = useAutenticacao();
  const podeVerValores = podeVerDadosSensiveis(usuario.role);

  const [deals, setDeals] = React.useState(dealsFunil);
  const [etapas, setEtapas] = React.useState(etapasFunil);
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
  const [novaTagDeal, setNovaTagDeal] = React.useState("");
  const [notaAtual, setNotaAtual] = React.useState("");
  const [notasPorDeal, setNotasPorDeal] = React.useState<
    Record<string, string[]>
  >({});
  const [atividadesPorDeal, setAtividadesPorDeal] = React.useState<
    Record<
      string,
      { titulo: string; data: string; hora: string; responsavel: string }[]
    >
  >({});
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
  const [funilDestino, setFunilDestino] = React.useState(
    funisDisponiveis[0].id
  );
  const [etapaDestino, setEtapaDestino] = React.useState("");
  const [motivoPerdaSelecionado, setMotivoPerdaSelecionado] =
    React.useState("Sem orçamento");
  const [limites, setLimites] = React.useState<Record<string, number>>(() =>
    etapas.reduce(
      (acc, etapa) => ({ ...acc, [etapa.id]: LIMITE_INICIAL }),
      {} as Record<string, number>
    )
  );

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

  const obterDataDeal = (deal: DealFunil) => {
    if (filtroDataCampo === "criado-em") return deal.criadoEm;
    if (filtroDataCampo === "ganho-perdido-em") return deal.ganhoPerdidoEm;
    if (filtroDataCampo === "previsao-fechamento")
      return deal.previsaoFechamento;
    if (filtroDataCampo === "ultima-mudanca") return deal.ultimaMudancaEtapa;
    if (filtroDataCampo === "campo-customizado") return deal.customizadoEm;
    return undefined;
  };

  const dentroDoPeriodo = (data?: string) => {
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
  };

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
    filtroCanal,
    filtroDataCampo,
    filtroDataPeriodo,
    filtroEtapa,
    filtroMotivoPerda,
    filtroOrigem,
    filtroOwner,
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
  const notasDeal = dealAtivo
    ? notasPorDeal[dealAtivo.id] ?? []
    : [];
  const atividadesDeal = dealAtivo
    ? atividadesPorDeal[dealAtivo.id] ?? []
    : [];
  const motivosPerdaValidos = motivosPerda.filter(
    (motivo) => motivo !== "todos"
  );
  const motivosPerdaOpcoes =
    motivosPerdaValidos.length > 0
      ? motivosPerdaValidos
      : ["Sem orçamento", "Sem resposta", "Concorrência", "Outros"];

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

  const handleAplicarTag = (tag: string) => {
    if (!tag || selecionados.length === 0) return;
    setDeals((atual) =>
      atual.map((deal) =>
        selecionados.includes(deal.id)
          ? { ...deal, tags: Array.from(new Set([...deal.tags, tag])) }
          : deal
      )
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

  const handleAdicionarTagDeal = () => {
    if (!dealAtivo || !novaTagDeal.trim()) return;
    const tag = novaTagDeal.trim();
    atualizarDeal(dealAtivo.id, {
      tags: Array.from(new Set([...dealAtivo.tags, tag])),
    });
    setNovaTagDeal("");
  };

  const handleRemoverTagDeal = (tag: string) => {
    if (!dealAtivo) return;
    atualizarDeal(dealAtivo.id, {
      tags: dealAtivo.tags.filter((item) => item !== tag),
    });
  };

  const handleMarcarGanho = () => {
    if (!dealAtivo) return;
    atualizarDeal(dealAtivo.id, { status: "ganho", motivoPerda: undefined });
  };

  const handleAbrirPerda = () => {
    if (!dealAtivo) return;
    setMotivoPerdaSelecionado(dealAtivo.motivoPerda ?? "Sem orçamento");
    setDialogPerdaAberto(true);
  };

  const handleConfirmarPerda = () => {
    if (!dealAtivo) return;
    atualizarDeal(dealAtivo.id, {
      status: "perdido",
      motivoPerda: motivoPerdaSelecionado,
    });
    setDialogPerdaAberto(false);
  };

  const handleExcluirDeal = () => {
    if (!dealAtivo) return;
    setDeals((atual) => atual.filter((deal) => deal.id !== dealAtivo.id));
    setDialogExcluirDealAberto(false);
    setDealAtivo(null);
  };

  const handleSalvarNota = () => {
    if (!dealAtivo || !notaAtual.trim()) return;
    const texto = notaAtual.trim();
    setNotasPorDeal((atual) => ({
      ...atual,
      [dealAtivo.id]: [...(atual[dealAtivo.id] ?? []), texto],
    }));
    setNotaAtual("");
    setDialogNotaAberto(false);
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

  const handleSalvarMoverDeal = () => {
    if (!dealAtivo) return;
    atualizarDeal(dealAtivo.id, {
      funilId: funilDestino,
      etapaId: etapaDestino || dealAtivo.etapaId,
    });
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

  const handleDrop = (etapaId: string) => (event: React.DragEvent) => {
    event.preventDefault();
    const dealId = event.dataTransfer.getData("text/plain") || arrastandoId;
    if (!dealId) return;
    setDeals((atual) =>
      atual.map((deal) =>
        deal.id === dealId ? { ...deal, etapaId } : deal
      )
    );
    setArrastandoId(null);
    setColunaEmHover(null);
  };

  const handleAdicionarEtapa = () => {
    if (!novaEtapa.trim()) return;
    const id = slug(novaEtapa);
    if (etapas.some((etapa) => etapa.id === id)) {
      return;
    }
    setEtapas((atual) => [
      ...atual,
      { id, nome: novaEtapa.trim(), cor: "#94a3b8" },
    ]);
    setNovaEtapa("");
  };

  const handleRenomearEtapa = (id: string, nome: string) => {
    setEtapas((atual) =>
      atual.map((etapa) => (etapa.id === id ? { ...etapa, nome } : etapa))
    );
  };

  const handleAtualizarCorEtapa = (id: string, cor: string) => {
    setEtapas((atual) =>
      atual.map((etapa) => (etapa.id === id ? { ...etapa, cor } : etapa))
    );
  };

  const handleMoverEtapa = (id: string, direcao: "up" | "down") => {
    setEtapas((atual) => {
      const index = atual.findIndex((etapa) => etapa.id === id);
      const destino = direcao === "up" ? index - 1 : index + 1;
      if (index < 0 || destino < 0 || destino >= atual.length) {
        return atual;
      }
      const copia = [...atual];
      [copia[index], copia[destino]] = [copia[destino], copia[index]];
      return copia;
    });
  };

  const handleRemoverEtapa = (id: string) => {
    setEtapas((atual) => atual.filter((etapa) => etapa.id !== id));
    const destino = etapas.find((etapa) => etapa.id !== id)?.id;
    if (destino) {
      setDeals((atual) =>
        atual.map((deal) =>
          deal.etapaId === id ? { ...deal, etapaId: destino } : deal
        )
      );
    }
    if (filtroEtapa === id) {
      setFiltroEtapa("todas");
    }
  };

  const handleSolicitarRemocaoEtapa = (etapa: EtapaFunil) => {
    setEtapaParaExcluir(etapa);
    setDialogExcluirEtapaAberto(true);
  };

  const handleConfirmarRemocaoEtapa = () => {
    if (!etapaParaExcluir) return;
    handleRemoverEtapa(etapaParaExcluir.id);
    setDialogExcluirEtapaAberto(false);
    setEtapaParaExcluir(null);
  };

  const handleEtapaDragStart = (id: string) => (event: React.DragEvent) => {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setEtapaArrastandoId(id);
  };

  const handleEtapaDrop = (id: string) => (event: React.DragEvent) => {
    event.preventDefault();
    const origem = event.dataTransfer.getData("text/plain") || etapaArrastandoId;
    if (!origem || origem === id) return;
    setEtapas((atual) => {
      const copia = [...atual];
      const origemIndex = copia.findIndex((etapa) => etapa.id === origem);
      const destinoIndex = copia.findIndex((etapa) => etapa.id === id);
      if (origemIndex < 0 || destinoIndex < 0) {
        return atual;
      }
      const [removida] = copia.splice(origemIndex, 1);
      copia.splice(destinoIndex, 0, removida);
      return copia;
    });
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

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Visualize deals por etapa e acompanhe o ritmo do funil.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar deals, empresa ou owner"
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
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroStatus}
                    onValueChange={(valor) =>
                      setFiltroStatus(valor as DealFunil["status"] | "todos")
                    }
                  >
                    <DropdownMenuRadioItem value="todos">
                      Todos os status
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="aberto">
                      Em aberto
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ganho">Ganho</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="perdido">
                      Perdido
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="pausado">
                      Pausado
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Valor</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroValor}
                    onValueChange={setFiltroValor}
                  >
                    <DropdownMenuRadioItem value="todos">
                      Todos os valores
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ate-20">
                      Até R$ 20k
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="20-50">
                      R$ 20k - 50k
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="50-100">
                      R$ 50k - 100k
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="acima-100">
                      Acima de R$ 100k
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Atribuído</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroOwner}
                    onValueChange={setFiltroOwner}
                  >
                    {owners.map((owner) => (
                      <DropdownMenuRadioItem key={owner} value={owner}>
                        {owner === "todos" ? "Todos os owners" : owner}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Produto</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroProduto}
                    onValueChange={setFiltroProduto}
                  >
                    {produtos.map((produto) => (
                      <DropdownMenuRadioItem key={produto} value={produto}>
                        {produto === "todos" ? "Todos os produtos" : produto}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Tag</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroTag}
                    onValueChange={setFiltroTag}
                  >
                    {tags.map((tag) => (
                      <DropdownMenuRadioItem key={tag} value={tag}>
                        {tag === "todas" ? "Todas as tags" : tag}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Motivo da perda</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroMotivoPerda}
                    onValueChange={setFiltroMotivoPerda}
                  >
                    {motivosPerda.map((motivo) => (
                      <DropdownMenuRadioItem key={motivo} value={motivo}>
                        {motivo === "todos" ? "Todos os motivos" : motivo}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Origem</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroOrigem}
                    onValueChange={setFiltroOrigem}
                  >
                    {origens.map((origem) => (
                      <DropdownMenuRadioItem key={origem} value={origem}>
                        {origem === "todas" ? "Todas as origens" : origem}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Etapa</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroEtapa}
                    onValueChange={setFiltroEtapa}
                  >
                    {etapasFiltro.map((etapaId) => (
                      <DropdownMenuRadioItem key={etapaId} value={etapaId}>
                        {etapaId === "todas"
                          ? "Todas as etapas"
                          : etapas.find((etapa) => etapa.id === etapaId)?.nome}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Canal</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={filtroCanal}
                    onValueChange={(valor) =>
                      setFiltroCanal(valor as CanalId | "todos")
                    }
                  >
                    <DropdownMenuRadioItem value="todos">
                      Todos os canais
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="whatsapp">
                      WhatsApp
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="instagram">
                      Instagram
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="messenger">
                      Messenger
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="email">Email</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="linkedin">
                      LinkedIn
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Datas</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-60">
                  <DropdownMenuLabel>Campo</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={filtroDataCampo}
                    onValueChange={handleFiltroDataCampo}
                  >
                    <DropdownMenuRadioItem value="todas">
                      Todos os campos
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="criado-em">
                      Criado em
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ganho-perdido-em">
                      Ganho/Perdido em
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="previsao-fechamento">
                      Previsão de fechamento
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ultima-mudanca">
                      Última mudança da etapa
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="campo-customizado">
                      Campos customizados
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Período</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={filtroDataPeriodo}
                    onValueChange={setFiltroDataPeriodo}
                  >
                    <DropdownMenuRadioItem value="todas">
                      Qualquer data
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="7d">
                      Últimos 7 dias
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="30d">
                      Últimos 30 dias
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="90d">
                      Últimos 90 dias
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Outros</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuCheckboxItem
                    checked={filtroSomenteComEmpresa}
                    onCheckedChange={(valor) =>
                      setFiltroSomenteComEmpresa(Boolean(valor))
                    }
                  >
                    Somente com empresa
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filtroSomenteComTags}
                    onCheckedChange={(valor) =>
                      setFiltroSomenteComTags(Boolean(valor))
                    }
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
        <Button variant="outline" onClick={() => setDialogEtapasAberto(true)}>
          Editar etapas
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/40 p-3">
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
            Selecione deals para aplicar tags, owner ou exclusão.
          </p>
        )}
      </div>

      <div className="w-full max-w-full overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {etapas.map((etapa) => {
            const dealsDaEtapa = dealsPorEtapa[etapa.id] ?? [];
            const limite = limites[etapa.id] ?? LIMITE_INICIAL;
            const visiveis = dealsDaEtapa.slice(0, limite);

            return (
              <div
                key={etapa.id}
                className={cn(
                  "flex h-[calc(100vh-360px)] min-h-[540px] w-[280px] flex-col rounded-2xl border border-border/60 bg-card/40",
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
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: etapa.cor ?? "hsl(var(--primary))",
                    }}
                  />
                  <p className="text-sm font-semibold">{etapa.nome}</p>
                </div>
                  <Badge variant="secondary">{dealsDaEtapa.length}</Badge>
                </div>
                <div
                  className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
                  onScroll={handleScrollColuna(etapa.id)}
                >
                  {visiveis.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                      Nenhum deal nesta etapa.
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
                          "cursor-pointer border border-border/60 bg-background/80 transition hover:border-primary/40 hover:bg-primary/5",
                          arrastandoId === deal.id && "opacity-60",
                          selecionados.includes(deal.id) && "border-primary/60"
                        )}
                      >
                        <CardContent className="space-y-3 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">{deal.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {deal.empresa ?? "Sem empresa"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {modoSelecao && (
                                <Checkbox
                                  checked={selecionados.includes(deal.id)}
                                  onCheckedChange={() =>
                                    handleToggleSelecionado(deal.id)
                                  }
                                  onClick={(event) => event.stopPropagation()}
                                />
                              )}
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <IconeCanal canal={deal.canal} className="h-3 w-3" />
                                {deal.canal.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm font-semibold">
                            {podeVerValores
                              ? formatarMoeda(deal.valor, deal.moeda)
                              : "Valor restrito"}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {deal.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{deal.ultimaAtividade}</span>
                            <span>{deal.owner}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {deal.ultimaMensagem}
                          </p>
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
            <DialogTitle>Excluir deals selecionados?</DialogTitle>
            <DialogDescription>
              Esta ação remove os deals do funil. Não é possível desfazer.
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
                    "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 transition",
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
                      className="h-8 w-8 cursor-pointer rounded-md border border-border/60 bg-transparent p-0"
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
              Os deals desta etapa serão movidos para a próxima etapa disponível.
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
        open={Boolean(dealAtivo)}
        onOpenChange={(aberto) => {
          if (!aberto) setDealAtivo(null);
        }}
      >
        <DialogContent className="left-auto right-0 top-0 h-full max-w-[420px] translate-x-0 translate-y-0 rounded-none border-l bg-background p-0 sm:rounded-l-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalhes do deal</DialogTitle>
            <DialogDescription>
              Painel com informações detalhadas do deal selecionado.
            </DialogDescription>
          </DialogHeader>
          {dealAtivo && (
            <ScrollArea className="h-full" type="always" scrollHideDelay={0}>
              <div className="flex min-h-full flex-col">
                <div className="border-b border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src="/avatars/contato-placeholder.svg"
                        alt={dealAtivo.nome}
                      />
                      <AvatarFallback>{iniciaisDeal(dealAtivo.nome)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-semibold">{dealAtivo.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {dealAtivo.telefone ?? "Telefone não informado"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-sm">
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

                  <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3 text-sm">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/app/inbox">IR PARA CONVERSA</Link>
                    </Button>
                    <Separator />
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-2"
                        onClick={handleMarcarGanho}
                      >
                        <Check className="h-4 w-4" />
                        Ganho
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={handleAbrirPerda}
                      >
                        <X className="h-4 w-4 text-destructive" />
                        Perdido
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={handleAbrirMoverDeal}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Mover
                      </Button>
                    </div>
                    <Separator />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={() => setDialogExcluirDealAberto(true)}
                    >
                      Excluir deal
                    </Button>
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

                  <div className="rounded-xl border border-border/60 bg-card/40 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">Tags do deal</p>
                      <Badge variant="secondary">{dealAtivo.tags.length}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {dealAtivo.tags.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhuma tag adicionada.
                        </p>
                      ) : (
                        dealAtivo.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoverTagDeal(tag)}
                              className="rounded-full p-0.5 transition hover:bg-muted"
                              aria-label={`Remover tag ${tag}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        value={novaTagDeal}
                        onChange={(event) => setNovaTagDeal(event.target.value)}
                        placeholder="Adicionar tag"
                      />
                      <Button size="sm" onClick={handleAdicionarTagDeal}>
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
                        <p className="font-medium">Resumo do deal</p>
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
                      <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm">
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
                      {atividadesDeal.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                          Nenhuma atividade registrada ainda.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {atividadesDeal.map((atividade, index) => (
                            <div
                              key={`${atividade.titulo}-${index}`}
                              className="rounded-lg border border-border/60 bg-background/80 p-3 text-xs"
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
                    </TabsContent>
                  </Tabs>

                  <Tabs defaultValue="notas">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="notas">Notas</TabsTrigger>
                      <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
                      <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
                    </TabsList>
                    <TabsContent value="notas" className="pt-4">
                      {notasDeal.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                          Nenhuma nota adicionada ainda.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {notasDeal.map((nota, index) => (
                            <div
                              key={`${dealAtivo.id}-nota-${index}`}
                              className="rounded-lg border border-border/60 bg-background/80 p-3 text-xs text-muted-foreground"
                            >
                              {nota}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="arquivos" className="pt-4">
                      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                        Arquivos do deal aparecerão aqui.
                      </div>
                    </TabsContent>
                    <TabsContent value="auditoria" className="pt-4">
                      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                        Histórico de alterações do deal.
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="mt-auto border-t border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAbrirEditarDeal}
                    >
                      Editar deal
                    </Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Mais ações"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Ações rápidas</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setDialogNotaAberto(true)}
                        >
                          Adicionar nota
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setDialogAtividadeAberto(true)}
                        >
                          Agendar atividade
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleAbrirMoverDeal}>
                          Mover deal
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
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
            <DialogTitle>Editar deal</DialogTitle>
            <DialogDescription>
              Atualize as informações principais do deal selecionado.
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
                placeholder="Nome do deal"
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
              Registre um insight ou informação importante sobre o deal.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notaAtual}
            onChange={(event) => setNotaAtual(event.target.value)}
            placeholder="Escreva a nota para este deal"
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogNotaAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarNota}>Salvar nota</Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover deal</DialogTitle>
            <DialogDescription>
              Escolha o funil e a etapa de destino para este deal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
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
                <SelectTrigger>
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
                <SelectTrigger>
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
          <DialogFooter>
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

      <Dialog open={dialogPerdaAberto} onOpenChange={setDialogPerdaAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como perdido</DialogTitle>
            <DialogDescription>
              Informe o motivo da perda para manter o histórico atualizado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Motivo</label>
            <Select
              value={motivoPerdaSelecionado}
              onValueChange={setMotivoPerdaSelecionado}
            >
              <SelectTrigger>
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
          <DialogFooter>
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
            <DialogTitle>Excluir deal?</DialogTitle>
            <DialogDescription>
              Esta ação remove o deal do funil e não pode ser desfeita.
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
              Excluir deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
