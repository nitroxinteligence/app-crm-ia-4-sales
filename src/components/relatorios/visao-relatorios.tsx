"use client";

import * as React from "react";
import { differenceInCalendarDays, format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Download,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { PainelConteudo } from "@/components/painel/painel-conteudo";
import { CartaoGraficoAtendimentos } from "@/components/painel/cartao-grafico-atendimentos";
import { CartaoGraficoAtendentes } from "@/components/painel/cartao-grafico-atendentes";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { KPINegocio, SerieGraficoTemporal } from "@/lib/types";

const chartConfigPercentual = {
  valor: {
    label: "Percentual",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const chartConfigProdutos = {
  valor: {
    label: "Movimentações",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const iconesKpi = {
  "leads-criados": BarChart3,
  "leads-convertidos": TrendingUp,
  "movimentacoes-funil": Activity,
  "conversas-resolvidas": TrendingDown,
};

type DadosNegocios = {
  ultimaAtualizacao?: string | null;
  kpis: KPINegocio[];
  series: {
    mensal: SerieGraficoTemporal;
    percentualAtendente: Array<{ nome: string; valor: number }>;
    etapasMovimentadas: Array<{ nome: string; valor: number }>;
    atendentes: Array<{ nome: string; valor: number }>;
  };
};

const formatarDataISO = (data: Date) => data.toISOString().slice(0, 10);

const calcularDiasPeriodo = (periodo?: DateRange) => {
  if (!periodo?.from) {
    return 30;
  }

  const fim = periodo.to ?? periodo.from;
  return Math.max(1, differenceInCalendarDays(fim, periodo.from) + 1);
};

export function VisaoRelatorios() {
  const { workspace } = useAutenticacao();
  const [abaAtiva, setAbaAtiva] = React.useState("negocios");
  const [dialogExportarAberto, setDialogExportarAberto] = React.useState(false);
  const [tipoMensal, setTipoMensal] = React.useState("valor");
  const [tipoAtendente, setTipoAtendente] = React.useState("valor");
  const [dadosNegocios, setDadosNegocios] = React.useState<DadosNegocios | null>(
    null
  );
  const [carregandoNegocios, setCarregandoNegocios] = React.useState(false);
  const [erroNegocios, setErroNegocios] = React.useState<string | null>(null);
  const [periodoAtendimentos, setPeriodoAtendimentos] = React.useState<
    DateRange | undefined
  >(undefined);
  const [exportando, setExportando] = React.useState(false);
  const [erroExportar, setErroExportar] = React.useState<string | null>(null);
  const hoje = React.useMemo(() => new Date(), []);
  const periodoPadrao = React.useMemo<DateRange>(() => {
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 29);
    return { from: inicio, to: hoje };
  }, [hoje]);
  const [periodoNegocios, setPeriodoNegocios] = React.useState<
    DateRange | undefined
  >(periodoPadrao);

  React.useEffect(() => {
    if (!periodoAtendimentos) {
      setPeriodoAtendimentos(periodoPadrao);
    }
  }, [periodoAtendimentos, periodoPadrao]);

  const diasSelecionadosNegocios = React.useMemo(
    () => calcularDiasPeriodo(periodoNegocios),
    [periodoNegocios]
  );

  const periodoTextoNegocios = periodoNegocios?.from
    ? periodoNegocios.to
      ? `${format(periodoNegocios.from, "dd MMM yyyy", { locale: ptBR })} - ${format(
          periodoNegocios.to,
          "dd MMM yyyy",
          { locale: ptBR }
        )}`
      : format(periodoNegocios.from, "dd MMM yyyy", { locale: ptBR })
    : "Selecione o período";

  const textoAtualizacaoNegocios = dadosNegocios?.ultimaAtualizacao
    ? `Atualizado há ${formatDistanceToNowStrict(
        new Date(dadosNegocios.ultimaAtualizacao),
        { locale: ptBR }
      )}`
    : null;

  React.useEffect(() => {
    const carregarNegocios = async () => {
      if (!workspace?.id || !periodoNegocios?.from) return;
      setCarregandoNegocios(true);
      setErroNegocios(null);

      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) {
        setErroNegocios("Sessão expirada.");
        setCarregandoNegocios(false);
        return;
      }

      const params = new URLSearchParams({
        workspaceId: workspace.id,
        from: formatarDataISO(periodoNegocios.from),
        to: formatarDataISO(periodoNegocios.to ?? periodoNegocios.from),
      });

      const response = await fetch(`/api/reports/negocios?${params}`, {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      if (!response.ok) {
        const message = await response.text();
        setErroNegocios(message || "Falha ao carregar relatórios.");
        setCarregandoNegocios(false);
        return;
      }

      const payload = (await response.json()) as DadosNegocios;
      setDadosNegocios(payload);
      setCarregandoNegocios(false);
    };

    void carregarNegocios();
  }, [periodoNegocios, workspace?.id]);

  const handleExportar = async () => {
    if (!workspace?.id) {
      setErroExportar("Workspace não encontrado.");
      return;
    }

    const periodoAtivo =
      abaAtiva === "negocios" ? periodoNegocios : periodoAtendimentos;

    if (!periodoAtivo?.from) {
      setErroExportar("Selecione um período antes de exportar.");
      return;
    }

    setExportando(true);
    setErroExportar(null);

    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
      setErroExportar("Sessão expirada.");
      setExportando(false);
      return;
    }

    const from = formatarDataISO(periodoAtivo.from);
    const to = formatarDataISO(periodoAtivo.to ?? periodoAtivo.from);
    const tipo = abaAtiva === "negocios" ? "negocios" : "atendimentos";

    const params = new URLSearchParams({
      workspaceId: workspace.id,
      from,
      to,
      tipo,
    });

    const response = await fetch(`/api/reports/export?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });

    if (!response.ok) {
      const message = await response.text();
      setErroExportar(message || "Falha ao exportar.");
      setExportando(false);
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${tipo}-${from}-${to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    setExportando(false);
    setDialogExportarAberto(false);
  };

  return (
    <Tabs
      value={abaAtiva}
      onValueChange={setAbaAtiva}
      className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Consolide indicadores e acompanhe a performance em tempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TabsList className="h-9">
            <TabsTrigger value="negocios">Negócios</TabsTrigger>
            <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>
          </TabsList>
          <Button className="gap-2" onClick={() => setDialogExportarAberto(true)}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <TabsContent value="negocios" className="space-y-6">
        <div
          className={`flex flex-wrap items-center gap-3 ${
            textoAtualizacaoNegocios ? "justify-between" : "justify-end"
          }`}
        >
          {textoAtualizacaoNegocios ? (
            <span className="text-xs text-muted-foreground">
              {textoAtualizacaoNegocios}
            </span>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 rounded-[6px] border border-border/60 bg-card/40 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>Período</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-empty={!periodoNegocios?.from}
                  className="h-9 w-[260px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                  {periodoTextoNegocios}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none" align="end">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  defaultMonth={periodoNegocios?.from}
                  selected={periodoNegocios}
                  onSelect={(novoPeriodo) => {
                    if (!novoPeriodo?.from) {
                      setPeriodoNegocios(periodoPadrao);
                      return;
                    }
                    setPeriodoNegocios(novoPeriodo);
                  }}
                  weekStartsOn={1}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPeriodoNegocios(periodoPadrao)}
              aria-label="Resetar período"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {diasSelecionadosNegocios} dias
            </span>
          </div>
        </div>

        {erroNegocios ? (
          <div className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {erroNegocios}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-4">
          {(carregandoNegocios && !dadosNegocios
            ? Array.from({ length: 4 }, () => null)
            : dadosNegocios?.kpis ?? []
          ).map((kpi, index) => {
            if (!kpi) {
              return (
                <div
                  key={`kpi-skeleton-${index}`}
                  className="h-[120px] rounded-[6px] border border-border/60 bg-muted/30"
                />
              );
            }
            const Icone = iconesKpi[kpi.id as keyof typeof iconesKpi];
            return (
              <Card key={kpi.id} className="shadow-none">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{kpi.titulo}</p>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-600"
                    >
                      {kpi.variacao}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-semibold">{kpi.valor}</p>
                      <p className="text-xs text-muted-foreground">
                        {kpi.subtitulo}
                      </p>
                    </div>
                    {Icone ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-border/60 text-primary">
                        <Icone className="h-5 w-5" />
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <CartaoGraficoAtendimentos
            serie={
              dadosNegocios?.series.mensal ?? {
                id: "leads-mensal",
                titulo: "Leads por mês",
                descricao: "Criados x convertidos",
                pontos: [],
              }
            }
            legendas={{ humano: "Criados", ia: "Convertidos" }}
            acao={
              <Select value={tipoMensal} onValueChange={setTipoMensal}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue placeholder="Valor" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                  <SelectItem value="valor">Valor</SelectItem>
                  <SelectItem value="quantidade">Quantidade</SelectItem>
                </SelectContent>
              </Select>
            }
            formatarEixoX={(valor) => valor}
            formatarTooltip={(valor) => `Período ${valor}`}
          />

          <Card className="shadow-none">
            <CardHeader className="flex flex-wrap items-start justify-between gap-3 pb-2">
              <div>
                <p className="text-sm font-medium">Percentual por atendente</p>
                <p className="text-xs text-muted-foreground">
                  Distribuição no período selecionado
                </p>
              </div>
              <Select value={tipoAtendente} onValueChange={setTipoAtendente}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue placeholder="Valor" />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                  <SelectItem value="valor">Valor</SelectItem>
                  <SelectItem value="quantidade">Quantidade</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfigPercentual}
                className="h-[280px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={dadosNegocios?.series.percentualAtendente ?? []}
                  layout="vertical"
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeOpacity={0.35}
                    horizontal={false}
                  />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={96}
                    tick={{ fontSize: 10 }}
                  />
                  <XAxis type="number" hide domain={[0, 100]} />
                  <ChartTooltip
                    formatter={(value) => `${value}%`}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <p className="text-sm font-medium">Etapas com mais movimentações</p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfigProdutos}
                className="h-[240px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={dadosNegocios?.series.etapasMovimentadas ?? []}
                  layout="vertical"
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeOpacity={0.35}
                    horizontal={false}
                  />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={120}
                    tick={{ fontSize: 10 }}
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <CartaoGraficoAtendentes
            titulo="Atendentes com mais movimentações"
            itens={dadosNegocios?.series.atendentes ?? []}
          />
        </section>
      </TabsContent>

      <TabsContent value="atendimentos">
        <PainelConteudo
          aoAtualizarPeriodo={setPeriodoAtendimentos}
          mostrarTitulo={false}
        />
      </TabsContent>

      <Dialog
        open={dialogExportarAberto}
        onOpenChange={(aberto) => {
          setDialogExportarAberto(aberto);
          if (aberto) {
            setErroExportar(null);
          }
        }}
      >
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>Exportar relatórios</DialogTitle>
            <DialogDescription>
              Selecione o formato e confirme a exportação dos dados.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-[6px] border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            Exportação pronta para download em CSV.
          </div>
          {erroExportar ? (
            <p className="text-xs text-destructive">{erroExportar}</p>
          ) : null}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogExportarAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleExportar} disabled={exportando}>
              {exportando ? "Exportando..." : "Baixar CSV"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
