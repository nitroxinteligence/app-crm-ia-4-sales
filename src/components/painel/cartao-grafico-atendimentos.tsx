"use client";

import type { ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SerieGraficoTemporal } from "@/lib/types";

type LegendasSerie = {
  humano?: string;
  ia?: string;
};

type CartaoGraficoAtendimentosProps = {
  serie: SerieGraficoTemporal;
  legendas?: LegendasSerie;
  acao?: ReactNode;
  formatarEixoX?: (valor: string) => string;
  formatarTooltip?: (valor: string) => string;
};

const formatarDataCurta = (valor: string) =>
  new Date(valor).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

const formatarDataLonga = (valor: string) =>
  new Date(valor).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function CartaoGraficoAtendimentos({
  serie,
  legendas,
  acao,
  formatarEixoX,
  formatarTooltip,
}: CartaoGraficoAtendimentosProps) {
  const chartConfig = {
    humano: {
      label: legendas?.humano ?? "Humano",
      color: "var(--chart-1)",
    },
    ia: {
      label: legendas?.ia ?? "IA",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const formatarEixo = formatarEixoX ?? formatarDataCurta;
  const formatarTooltipLabel = formatarTooltip ?? formatarDataLonga;

  return (
    <Card className="rounded-[6px] shadow-none">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">{serie.titulo}</p>
          <p className="text-xs text-muted-foreground">{serie.descricao}</p>
        </div>
        {acao ? <div className="shrink-0">{acao}</div> : null}
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={serie.pontos}>
            <defs>
              <linearGradient id="fillHumano" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-humano)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-humano)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillIa" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-ia)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-ia)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.35} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => formatarEixo(String(value))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    formatarTooltipLabel(String(value))
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="ia"
              type="natural"
              fill="url(#fillIa)"
              stroke="var(--color-ia)"
              stackId="a"
            />
            <Area
              dataKey="humano"
              type="natural"
              fill="url(#fillHumano)"
              stroke="var(--color-humano)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
