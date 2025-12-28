"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronsRight,
  Clock,
  FilePlus,
  Filter,
  Link2,
  Plus,
  Search,
} from "lucide-react";
import type {
  RelacionamentoTarefa,
  StatusTarefa,
  TarefaCalendario,
  TipoTarefa,
} from "@/lib/types";
import { tarefasCalendario } from "@/lib/mock/tarefas";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuContent,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LIMITE_INICIAL = 24;

const tiposLabel: Record<TipoTarefa, string> = {
  ligacao: "Ligação",
  reuniao: "Reunião",
  "follow-up": "Follow-up",
  email: "Email",
  outro: "Outro",
};

const statusLabel: Record<StatusTarefa, string> = {
  pendente: "Pendente",
  concluida: "Concluída",
};

const relacionamentoLabel: Record<RelacionamentoTarefa, string> = {
  lead: "Lead",
  deal: "Deal",
  ticket: "Ticket",
  conversa: "Conversa",
};

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const formatarDataCurta = (dataISO: string) =>
  new Date(dataISO).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

const formatarDiaSemana = (dataISO: string) =>
  new Date(dataISO).toLocaleDateString("pt-BR", { weekday: "short" });

const obterDiaMes = (dataISO: string) => new Date(dataISO).getDate();
const obterMesAno = (dataISO: string) =>
  new Date(dataISO).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

export function VisaoCalendario() {
  const [tarefas, setTarefas] = React.useState(tarefasCalendario);
  const [busca, setBusca] = React.useState("");
  const [filtroTipo, setFiltroTipo] = React.useState<TipoTarefa | "todos">(
    "todos"
  );
  const [filtroResponsavel, setFiltroResponsavel] = React.useState("todos");
  const [filtroStatus, setFiltroStatus] = React.useState<StatusTarefa | "todos">(
    "todos"
  );
  const [limite, setLimite] = React.useState(LIMITE_INICIAL);
  const [dialogNovaAberto, setDialogNovaAberto] = React.useState(false);
  const [novaTarefa, setNovaTarefa] = React.useState({
    titulo: "",
    tipo: "ligacao" as TipoTarefa,
    data: new Date().toISOString().slice(0, 10),
    hora: "09:00",
    responsavel: "",
    relacionamentoTipo: "nenhum" as "nenhum" | RelacionamentoTarefa,
    relacionamentoNome: "",
  });

  const responsaveis = React.useMemo(() => {
    const todos = new Set(tarefas.map((tarefa) => tarefa.responsavel));
    return ["todos", ...Array.from(todos)];
  }, [tarefas]);

  const tarefasFiltradas = React.useMemo(() => {
    return tarefas.filter((tarefa) => {
      if (filtroTipo !== "todos" && tarefa.tipo !== filtroTipo) {
        return false;
      }
      if (filtroResponsavel !== "todos" && tarefa.responsavel !== filtroResponsavel) {
        return false;
      }
      if (filtroStatus !== "todos" && tarefa.status !== filtroStatus) {
        return false;
      }
      if (!busca) return true;
      const termo = busca.toLowerCase();
      return (
        tarefa.titulo.toLowerCase().includes(termo) ||
        tarefa.responsavel.toLowerCase().includes(termo) ||
        (tarefa.relacionamentoNome ?? "").toLowerCase().includes(termo)
      );
    });
  }, [busca, filtroResponsavel, filtroStatus, filtroTipo, tarefas]);

  const tarefasVisiveis = tarefasFiltradas.slice(0, limite);
  const temMais = tarefasFiltradas.length > tarefasVisiveis.length;

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const alvo = event.currentTarget;
      const chegouNoFim =
        alvo.scrollTop + alvo.clientHeight >= alvo.scrollHeight - 80;
      if (chegouNoFim && temMais) {
        setLimite((atual) => Math.min(atual + 20, tarefasFiltradas.length));
      }
    },
    [tarefasFiltradas.length, temMais]
  );

  const tarefasPorDia = React.useMemo(() => {
    const atual = new Date();
    const mes = atual.getMonth();
    const ano = atual.getFullYear();
    return tarefas.reduce<Record<number, TarefaCalendario[]>>((acc, tarefa) => {
      const data = new Date(tarefa.data);
      if (data.getMonth() !== mes || data.getFullYear() !== ano) {
        return acc;
      }
      const dia = data.getDate();
      acc[dia] = acc[dia] ? [...acc[dia], tarefa] : [tarefa];
      return acc;
    }, {});
  }, [tarefas]);

  const tarefasSemana = React.useMemo(() => {
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - hoje.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const data = new Date(inicio);
      data.setDate(inicio.getDate() + index);
      const dataISO = data.toISOString();
      const tarefasDia = tarefas.filter(
        (tarefa) => formatarDataCurta(tarefa.data) === formatarDataCurta(dataISO)
      );
      return {
        dataISO,
        tarefas: tarefasDia,
      };
    });
  }, [tarefas]);

  const diasNoMes = React.useMemo(() => {
    const atual = new Date();
    return new Date(atual.getFullYear(), atual.getMonth() + 1, 0).getDate();
  }, []);

  const handleToggleStatus = (id: string) => {
    setTarefas((atual) =>
      atual.map((tarefa) =>
        tarefa.id === id
          ? {
              ...tarefa,
              status: tarefa.status === "pendente" ? "concluida" : "pendente",
            }
          : tarefa
      )
    );
  };

  const handleAbrirNovaTarefa = () => {
    setNovaTarefa((atual) => ({
      ...atual,
      titulo: "",
      tipo: "ligacao",
      data: new Date().toISOString().slice(0, 10),
      hora: "09:00",
      responsavel: responsaveis.find((item) => item !== "todos") ?? "",
      relacionamentoTipo: "nenhum",
      relacionamentoNome: "",
    }));
    setDialogNovaAberto(true);
  };

  const handleCriarTarefa = () => {
    if (!novaTarefa.titulo.trim() || !novaTarefa.responsavel.trim()) {
      return;
    }
    const dataISO = new Date(`${novaTarefa.data}T00:00:00`).toISOString();
    const nova: TarefaCalendario = {
      id: `tarefa-${Date.now()}`,
      titulo: novaTarefa.titulo.trim(),
      tipo: novaTarefa.tipo,
      data: dataISO,
      hora: novaTarefa.hora,
      responsavel: novaTarefa.responsavel,
      relacionamentoTipo:
        novaTarefa.relacionamentoTipo === "nenhum"
          ? undefined
          : novaTarefa.relacionamentoTipo,
      relacionamentoNome:
        novaTarefa.relacionamentoTipo === "nenhum"
          ? undefined
          : novaTarefa.relacionamentoNome || undefined,
      criadoPor: "usuario",
      status: "pendente",
    };
    setTarefas((atual) => [nova, ...atual]);
    setDialogNovaAberto(false);
  };

  const mesAtual = obterMesAno(new Date().toISOString());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Calendário</h1>
          <p className="text-sm text-muted-foreground">
            Planeje tarefas e acompanhe sua agenda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button className="gap-2" onClick={handleAbrirNovaTarefa}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por tarefa, responsável ou relacionamento"
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Filtros</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Tipo</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuRadioGroup
                  value={filtroTipo}
                  onValueChange={(valor) =>
                    setFiltroTipo(valor as TipoTarefa | "todos")
                  }
                >
                  <DropdownMenuRadioItem value="todos">
                    Todos os tipos
                  </DropdownMenuRadioItem>
                  {Object.entries(tiposLabel).map(([valor, label]) => (
                    <DropdownMenuRadioItem key={valor} value={valor}>
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Responsável</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuRadioGroup
                  value={filtroResponsavel}
                  onValueChange={setFiltroResponsavel}
                >
                  {responsaveis.map((responsavel) => (
                    <DropdownMenuRadioItem key={responsavel} value={responsavel}>
                      {responsavel === "todos" ? "Todos" : responsavel}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuRadioGroup
                  value={filtroStatus}
                  onValueChange={(valor) =>
                    setFiltroStatus(valor as StatusTarefa | "todos")
                  }
                >
                  <DropdownMenuRadioItem value="todos">
                    Todos
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="pendente">
                    Pendente
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="concluida">
                    Concluída
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setFiltroTipo("todos");
                setFiltroResponsavel("todos");
                setFiltroStatus("todos");
                setBusca("");
              }}
            >
              Limpar filtros
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="mes">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="mes">Mês</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="mes" className="pt-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Mês atual</p>
                  <p className="text-xs text-muted-foreground">
                    {mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)}
                  </p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {tarefas.length} tarefas
                </Badge>
              </div>
              <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
                {diasSemana.map((dia) => (
                  <span key={dia} className="text-center">
                    {dia}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: diasNoMes }, (_, index) => {
                  const dia = index + 1;
                  const tarefasDia = tarefasPorDia[dia] ?? [];
                  return (
                    <div
                      key={`dia-${dia}`}
                      className={cn(
                        "flex min-h-[90px] flex-col justify-between rounded-xl border border-border/60 bg-background/70 p-2 text-xs",
                        tarefasDia.length > 0 && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <span className="font-semibold">{dia}</span>
                      {tarefasDia.length > 0 ? (
                        <div className="space-y-1 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {tarefasDia.length} tarefa(s)
                          </div>
                          <span className="truncate">
                            {tarefasDia[0].titulo}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          Sem tarefas
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="semana" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {tarefasSemana.map((dia) => (
              <Card key={dia.dataISO}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {formatarDiaSemana(dia.dataISO)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatarDataCurta(dia.dataISO)}
                      </p>
                    </div>
                    <Badge variant="secondary">{dia.tarefas.length}</Badge>
                  </div>
                  {dia.tarefas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma tarefa prevista.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dia.tarefas.slice(0, 3).map((tarefa) => (
                        <div
                          key={tarefa.id}
                          className="rounded-lg border border-border/60 bg-background/80 p-2 text-xs"
                        >
                          <p className="font-medium">{tarefa.titulo}</p>
                          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {tarefa.hora}
                          </div>
                        </div>
                      ))}
                      {dia.tarefas.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          + {dia.tarefas.length - 3} outras
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="agenda" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <div
                className="max-h-[520px] space-y-3 overflow-auto"
                onScroll={handleScroll}
              >
                {tarefasVisiveis.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    Nenhuma tarefa encontrada.
                  </div>
                ) : (
                  tarefasVisiveis.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 p-3 text-sm"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={tarefa.status === "concluida"}
                          onCheckedChange={() => handleToggleStatus(tarefa.id)}
                          aria-label={`Concluir tarefa ${tarefa.titulo}`}
                        />
                        <div>
                          <p
                            className={cn(
                              "font-medium",
                              tarefa.status === "concluida" &&
                                "text-muted-foreground line-through"
                            )}
                          >
                            {tarefa.titulo}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatarDataCurta(tarefa.data)}</span>
                            <span>{tarefa.hora}</span>
                            <span>{tarefa.responsavel}</span>
                            {tarefa.relacionamentoTipo && (
                              <span className="flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                {relacionamentoLabel[tarefa.relacionamentoTipo]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">{tiposLabel[tarefa.tipo]}</Badge>
                        <Badge variant="outline">
                          {statusLabel[tarefa.status]}
                        </Badge>
                        {tarefa.criadoPor === "agente" && (
                          <Badge variant="outline">Criado por agente</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {temMais && (
                  <p className="text-center text-xs text-muted-foreground">
                    Carregando mais tarefas...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Integrações</p>
                <p className="text-xs text-muted-foreground">
                  Conecte calendários externos para sincronizar tarefas.
                </p>
              </div>
              <Badge variant="outline">2 disponíveis</Badge>
            </div>
            <Separator />
            <div className="space-y-3">
              {[
                { nome: "Google Calendar", status: "Desconectado" },
                { nome: "Outlook Calendar", status: "Desconectado" },
              ].map((item) => (
                <div
                  key={item.nome}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-3 text-sm"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">{item.status}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ChevronsRight className="h-4 w-4" />
                    Conectar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Resumo rápido</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pendentes</span>
                <span>
                  {tarefas.filter((tarefa) => tarefa.status === "pendente").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Concluídas</span>
                <span>
                  {tarefas.filter((tarefa) => tarefa.status === "concluida").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Responsáveis</span>
                <span>{responsaveis.length - 1}</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FilePlus className="h-4 w-4" />
              Somente tarefas criadas pelo usuário nesta versão.
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogNovaAberto} onOpenChange={setDialogNovaAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
            <DialogDescription>
              Crie uma tarefa manual e associe a um relacionamento opcional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label htmlFor="tarefa-titulo" className="text-sm font-medium">
                Título
              </label>
              <Input
                id="tarefa-titulo"
                value={novaTarefa.titulo}
                onChange={(event) =>
                  setNovaTarefa((atual) => ({
                    ...atual,
                    titulo: event.target.value,
                  }))
                }
                placeholder="Ex: Reunião de alinhamento"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select
                value={novaTarefa.tipo}
                onValueChange={(valor) =>
                  setNovaTarefa((atual) => ({
                    ...atual,
                    tipo: valor as TipoTarefa,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tiposLabel).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="tarefa-data" className="text-sm font-medium">
                  Data
                </label>
                <Input
                  id="tarefa-data"
                  type="date"
                  value={novaTarefa.data}
                  onChange={(event) =>
                    setNovaTarefa((atual) => ({
                      ...atual,
                      data: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="tarefa-hora" className="text-sm font-medium">
                  Hora
                </label>
                <Input
                  id="tarefa-hora"
                  type="time"
                  value={novaTarefa.hora}
                  onChange={(event) =>
                    setNovaTarefa((atual) => ({
                      ...atual,
                      hora: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Responsável</label>
              <Select
                value={novaTarefa.responsavel}
                onValueChange={(valor) =>
                  setNovaTarefa((atual) => ({
                    ...atual,
                    responsavel: valor,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis
                    .filter((item) => item !== "todos")
                    .map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Relacionamento</label>
                <Select
                  value={novaTarefa.relacionamentoTipo}
                  onValueChange={(valor) =>
                    setNovaTarefa((atual) => ({
                      ...atual,
                      relacionamentoTipo: valor as "nenhum" | RelacionamentoTarefa,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem relacionamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Sem relacionamento</SelectItem>
                    {Object.entries(relacionamentoLabel).map(([valor, label]) => (
                      <SelectItem key={valor} value={valor}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label
                  htmlFor="tarefa-relacionamento"
                  className="text-sm font-medium"
                >
                  Nome do relacionamento
                </label>
                <Input
                  id="tarefa-relacionamento"
                  value={novaTarefa.relacionamentoNome}
                  onChange={(event) =>
                    setNovaTarefa((atual) => ({
                      ...atual,
                      relacionamentoNome: event.target.value,
                    }))
                  }
                  placeholder="Ex: Ana Carvalho"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Criado por agente</p>
                <p className="text-xs text-muted-foreground">
                  Bloqueado na versão atual.
                </p>
              </div>
              <Switch disabled />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogNovaAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarTarefa}>Salvar tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
