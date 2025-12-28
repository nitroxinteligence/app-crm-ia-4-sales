"use client";

import * as React from "react";
import {
  BarChart3,
  CalendarRange,
  Download,
  Filter,
  Radar,
  Search,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
} from "recharts";
import type { CanalRelatorio, PeriodoRelatorio } from "@/lib/types";
import {
  kpisRelatorio,
  relatorioAgentes,
  relatorioInbox,
  relatorioVendas,
  seriesRelatorio,
} from "@/lib/mock/relatorios";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const periodos: { label: string; value: PeriodoRelatorio }[] = [
  { label: "Hoje", value: "hoje" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
];

const canais: { label: string; value: CanalRelatorio }[] = [
  { label: "Todos", value: "todos" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Instagram", value: "instagram" },
  { label: "Messenger", value: "messenger" },
  { label: "Email", value: "email" },
  { label: "LinkedIn", value: "linkedin" },
];

const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const conversasChartData = seriesRelatorio[0].pontos.map((valor, index) => {
  const humano = Math.round(valor * 0.62);
  return {
    dia: diasSemana[index] ?? `D${index + 1}`,
    humano,
    ia: Math.max(valor - humano, 0),
  };
});

const receitaChartData = [
  { date: "2024-04-01", nova: 222, recorrente: 150 },
  { date: "2024-04-02", nova: 97, recorrente: 180 },
  { date: "2024-04-03", nova: 167, recorrente: 120 },
  { date: "2024-04-04", nova: 242, recorrente: 260 },
  { date: "2024-04-05", nova: 373, recorrente: 290 },
  { date: "2024-04-06", nova: 301, recorrente: 340 },
  { date: "2024-04-07", nova: 245, recorrente: 180 },
  { date: "2024-04-08", nova: 409, recorrente: 320 },
  { date: "2024-04-09", nova: 59, recorrente: 110 },
  { date: "2024-04-10", nova: 261, recorrente: 190 },
  { date: "2024-04-11", nova: 327, recorrente: 350 },
  { date: "2024-04-12", nova: 292, recorrente: 210 },
  { date: "2024-04-13", nova: 342, recorrente: 380 },
  { date: "2024-04-14", nova: 137, recorrente: 220 },
  { date: "2024-04-15", nova: 120, recorrente: 170 },
  { date: "2024-04-16", nova: 138, recorrente: 190 },
  { date: "2024-04-17", nova: 446, recorrente: 360 },
  { date: "2024-04-18", nova: 364, recorrente: 410 },
  { date: "2024-04-19", nova: 243, recorrente: 180 },
  { date: "2024-04-20", nova: 89, recorrente: 150 },
  { date: "2024-04-21", nova: 137, recorrente: 200 },
  { date: "2024-04-22", nova: 224, recorrente: 170 },
  { date: "2024-04-23", nova: 138, recorrente: 230 },
  { date: "2024-04-24", nova: 387, recorrente: 290 },
  { date: "2024-04-25", nova: 215, recorrente: 250 },
  { date: "2024-04-26", nova: 75, recorrente: 130 },
  { date: "2024-04-27", nova: 383, recorrente: 420 },
  { date: "2024-04-28", nova: 122, recorrente: 180 },
  { date: "2024-04-29", nova: 315, recorrente: 240 },
  { date: "2024-04-30", nova: 454, recorrente: 380 },
  { date: "2024-05-01", nova: 165, recorrente: 220 },
  { date: "2024-05-02", nova: 293, recorrente: 310 },
  { date: "2024-05-03", nova: 247, recorrente: 190 },
  { date: "2024-05-04", nova: 385, recorrente: 420 },
  { date: "2024-05-05", nova: 481, recorrente: 390 },
  { date: "2024-05-06", nova: 498, recorrente: 520 },
  { date: "2024-05-07", nova: 388, recorrente: 300 },
  { date: "2024-05-08", nova: 149, recorrente: 210 },
  { date: "2024-05-09", nova: 227, recorrente: 180 },
  { date: "2024-05-10", nova: 293, recorrente: 330 },
  { date: "2024-05-11", nova: 335, recorrente: 270 },
  { date: "2024-05-12", nova: 197, recorrente: 240 },
  { date: "2024-05-13", nova: 197, recorrente: 160 },
  { date: "2024-05-14", nova: 448, recorrente: 490 },
  { date: "2024-05-15", nova: 473, recorrente: 380 },
  { date: "2024-05-16", nova: 338, recorrente: 400 },
  { date: "2024-05-17", nova: 499, recorrente: 420 },
  { date: "2024-05-18", nova: 315, recorrente: 350 },
  { date: "2024-05-19", nova: 235, recorrente: 180 },
  { date: "2024-05-20", nova: 177, recorrente: 230 },
  { date: "2024-05-21", nova: 82, recorrente: 140 },
  { date: "2024-05-22", nova: 81, recorrente: 120 },
  { date: "2024-05-23", nova: 252, recorrente: 290 },
  { date: "2024-05-24", nova: 294, recorrente: 220 },
  { date: "2024-05-25", nova: 201, recorrente: 250 },
  { date: "2024-05-26", nova: 213, recorrente: 170 },
  { date: "2024-05-27", nova: 420, recorrente: 460 },
  { date: "2024-05-28", nova: 233, recorrente: 190 },
  { date: "2024-05-29", nova: 78, recorrente: 130 },
  { date: "2024-05-30", nova: 340, recorrente: 280 },
  { date: "2024-05-31", nova: 178, recorrente: 230 },
  { date: "2024-06-01", nova: 178, recorrente: 200 },
  { date: "2024-06-02", nova: 470, recorrente: 410 },
  { date: "2024-06-03", nova: 103, recorrente: 160 },
  { date: "2024-06-04", nova: 439, recorrente: 380 },
  { date: "2024-06-05", nova: 88, recorrente: 140 },
  { date: "2024-06-06", nova: 294, recorrente: 250 },
  { date: "2024-06-07", nova: 323, recorrente: 370 },
  { date: "2024-06-08", nova: 385, recorrente: 320 },
  { date: "2024-06-09", nova: 438, recorrente: 480 },
  { date: "2024-06-10", nova: 155, recorrente: 200 },
  { date: "2024-06-11", nova: 92, recorrente: 150 },
  { date: "2024-06-12", nova: 492, recorrente: 420 },
  { date: "2024-06-13", nova: 81, recorrente: 130 },
  { date: "2024-06-14", nova: 426, recorrente: 380 },
  { date: "2024-06-15", nova: 307, recorrente: 350 },
  { date: "2024-06-16", nova: 371, recorrente: 310 },
  { date: "2024-06-17", nova: 475, recorrente: 520 },
  { date: "2024-06-18", nova: 107, recorrente: 170 },
  { date: "2024-06-19", nova: 341, recorrente: 290 },
  { date: "2024-06-20", nova: 408, recorrente: 450 },
  { date: "2024-06-21", nova: 169, recorrente: 210 },
  { date: "2024-06-22", nova: 317, recorrente: 270 },
  { date: "2024-06-23", nova: 480, recorrente: 530 },
  { date: "2024-06-24", nova: 132, recorrente: 180 },
  { date: "2024-06-25", nova: 141, recorrente: 190 },
  { date: "2024-06-26", nova: 434, recorrente: 380 },
  { date: "2024-06-27", nova: 448, recorrente: 490 },
  { date: "2024-06-28", nova: 149, recorrente: 200 },
  { date: "2024-06-29", nova: 103, recorrente: 160 },
  { date: "2024-06-30", nova: 446, recorrente: 400 },
];

const conversasChartConfig = {
  humano: {
    label: "Humano",
    color: "var(--chart-1)",
  },
  ia: {
    label: "IA",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const receitaChartConfig = {
  nova: {
    label: "Nova",
    color: "var(--chart-1)",
  },
  recorrente: {
    label: "Recorrente",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function VisaoRelatorios() {
  const [periodo, setPeriodo] = React.useState<PeriodoRelatorio>("30d");
  const [canal, setCanal] = React.useState<CanalRelatorio>("todos");
  const [agente, setAgente] = React.useState("todos");
  const [busca, setBusca] = React.useState("");
  const [dialogExportarAberto, setDialogExportarAberto] = React.useState(false);
  const faixaReceita = "30d";

  const agentes = React.useMemo(
    () => ["todos", ...relatorioAgentes.map((agente) => agente.nome)],
    []
  );

  const kpisFiltrados = React.useMemo(() => {
    if (!busca) return kpisRelatorio;
    return kpisRelatorio.filter((kpi) =>
      kpi.titulo.toLowerCase().includes(busca.toLowerCase())
    );
  }, [busca]);

  const receitaFiltrada = React.useMemo(() => {
    const referencia = receitaChartData.at(-1)?.date ?? "2024-06-30";
    const dataReferencia = new Date(referencia);
    let dias = 90;
    if (faixaReceita === "30d") dias = 30;
    if (faixaReceita === "7d") dias = 7;
    const dataInicial = new Date(dataReferencia);
    dataInicial.setDate(dataInicial.getDate() - dias);
    return receitaChartData.filter((item) => new Date(item.date) >= dataInicial);
  }, [faixaReceita]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Consolide indicadores e acompanhe a performance em tempo real.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogExportarAberto(true)}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar métricas, agentes ou insights"
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Período</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={periodo}
              onValueChange={(valor) => setPeriodo(valor as PeriodoRelatorio)}
            >
              {periodos.map((item) => (
                <DropdownMenuRadioItem key={item.value} value={item.value}>
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Canal</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={canal}
              onValueChange={(valor) => setCanal(valor as CanalRelatorio)}
            >
              {canais.map((item) => (
                <DropdownMenuRadioItem key={item.value} value={item.value}>
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Select value={agente} onValueChange={setAgente}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Agente" />
          </SelectTrigger>
          <SelectContent>
            {agentes.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "todos" ? "Todos os agentes" : item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="gap-1">
          <CalendarRange className="h-3 w-3" />
          {periodos.find((item) => item.value === periodo)?.label}
        </Badge>
        <Badge variant="outline">
          {canal === "todos" ? "Todos os canais" : canais.find((c) => c.value === canal)?.label}
        </Badge>
        <Badge variant="outline">{agente === "todos" ? "Todos os agentes" : agente}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {kpisFiltrados.map((kpi) => (
          <Card key={kpi.id} className="shadow-none">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs text-muted-foreground">{kpi.titulo}</p>
              <p className="text-2xl font-semibold">{kpi.valor}</p>
              <p className="text-xs text-muted-foreground">{kpi.variacao}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agentes">Agentes</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="shadow-none">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Conversas por dia</p>
                    <p className="text-xs text-muted-foreground">
                      Humano x IA · 7 dias
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: "var(--color-humano)" }}
                      />
                      Humano
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: "var(--color-ia)" }}
                      />
                      IA
                    </div>
                  </div>
                </div>
                <ChartContainer
                  config={conversasChartConfig}
                  className="h-[240px] w-full"
                >
                  <BarChart accessibilityLayer data={conversasChartData}>
                    <CartesianGrid stroke="var(--border)" strokeOpacity={0.35} />
                    <XAxis
                      dataKey="dia"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 10 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar
                      dataKey="humano"
                      stackId="a"
                      fill="var(--color-humano)"
                      radius={[0, 0, 4, 4]}
                    />
                    <Bar
                      dataKey="ia"
                      stackId="a"
                      fill="var(--color-ia)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
                <p className="text-xs text-muted-foreground">
                  Dados simulados do período selecionado.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Receita semanal</p>
                    <p className="text-xs text-muted-foreground">
                      Nova x recorrente · Últimos 30 dias
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: "var(--color-nova)" }}
                      />
                      Nova
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: "var(--color-recorrente)" }}
                      />
                      Recorrente
                    </div>
                  </div>
                </div>
                <ChartContainer
                  config={receitaChartConfig}
                  className="h-[250px] w-full"
                >
                  <AreaChart data={receitaFiltrada}>
                    <defs>
                      <linearGradient id="fillNova" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--color-nova)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-nova)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="fillRecorrente"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-recorrente)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-recorrente)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeOpacity={0.35} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) =>
                            new Date(value).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })
                          }
                        />
                      }
                    />
                    <Area
                      dataKey="recorrente"
                      type="natural"
                      fill="url(#fillRecorrente)"
                      stroke="var(--color-recorrente)"
                      stackId="a"
                    />
                    <Area
                      dataKey="nova"
                      type="natural"
                      fill="url(#fillNova)"
                      stroke="var(--color-nova)"
                      stackId="a"
                    />
                  </AreaChart>
                </ChartContainer>
                <p className="text-xs text-muted-foreground">
                  Evolução semanal de receita estimada.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agentes" className="pt-4">
          <Card className="shadow-none">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Performance por agente</p>
                <Badge variant="outline" className="gap-1">
                  <Radar className="h-3 w-3" />
                  SLA e conversão
                </Badge>
              </div>
              <div className="space-y-3">
                {relatorioAgentes.map((agente) => (
                  <div
                    key={agente.id}
                    className={cn(
                      "grid items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3 text-sm",
                      "md:grid-cols-[1.2fr_1fr_1fr_1fr]"
                    )}
                  >
                    <span className="font-medium">{agente.nome}</span>
                    <span className="text-muted-foreground">
                      {agente.conversas} conversas
                    </span>
                    <span className="text-muted-foreground">
                      {agente.tempoMedio}
                    </span>
                    <Badge variant="secondary">{agente.taxaConversao}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Card className="shadow-none">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Pipeline financeiro</p>
                  <Badge variant="outline" className="gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Funil
                  </Badge>
                </div>
                <div className="space-y-3">
                  {relatorioVendas.map((etapa) => (
                    <div
                      key={etapa.id}
                      className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{etapa.etapa}</span>
                        <Badge variant="secondary">{etapa.deals} deals</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {etapa.valor} em potencial
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="space-y-4 p-4">
                <p className="text-sm font-semibold">Conversão por etapa</p>
                <div className="space-y-3">
                  {relatorioVendas.map((etapa, index) => (
                    <div key={`conv-${etapa.id}`} className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>{etapa.etapa}</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.max(10, 48 - index * 6)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary/60"
                          style={{ width: `${Math.max(10, 48 - index * 6)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inbox" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Card className="shadow-none">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Volume por canal</p>
                  <Badge variant="outline">Atendimento</Badge>
                </div>
                <div className="space-y-3">
                  {relatorioInbox.map((canalItem) => (
                    <div
                      key={canalItem.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-3 text-sm"
                    >
                      <span>{canalItem.canal}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{canalItem.volume}</Badge>
                        <span className="text-xs text-muted-foreground">
                          SLA {canalItem.sla}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="space-y-4 p-4">
                <p className="text-sm font-semibold">Qualidade de atendimento</p>
                <div className="space-y-3">
                  {["Satisfação", "Tempo de resposta", "Resolução"].map(
                    (item, index) => (
                      <div key={item} className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>{item}</span>
                          <span className="text-xs text-muted-foreground">
                            {72 - index * 8}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary/60"
                            style={{ width: `${72 - index * 8}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogExportarAberto} onOpenChange={setDialogExportarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar relatórios</DialogTitle>
            <DialogDescription>
              Selecione o formato e confirme a exportação dos dados.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            Exportação pronta para download (UI mock).
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogExportarAberto(false)}>
              Cancelar
            </Button>
            <Button>Baixar CSV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
