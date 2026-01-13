"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SerieGraficoTemporal } from "@/lib/types";

const chartConfigBase = {
  humano: {
    label: "Humano",
    color: "var(--chart-2)",
  },
  ia: {
    label: "IA",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function CartaoGraficoTempoInicio({
  serie,
  legendas,
}: {
  serie: SerieGraficoTemporal;
  legendas?: { humano?: string; ia?: string };
}) {
  const [ativo, setAtivo] =
    React.useState<keyof typeof chartConfigBase>("humano");

  const chartConfig = React.useMemo(
    () => ({
      humano: {
        ...chartConfigBase.humano,
        label: legendas?.humano ?? chartConfigBase.humano.label,
      },
      ia: {
        ...chartConfigBase.ia,
        label: legendas?.ia ?? chartConfigBase.ia.label,
      },
    }),
    [legendas]
  );

  return (
    <Card className="rounded-[6px] shadow-none">
      <CardHeader className="space-y-1 pb-2">
        <p className="text-sm font-medium">{serie.titulo}</p>
        <p className="text-xs text-muted-foreground">{serie.descricao}</p>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={serie.pontos}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.35} />
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
                  className="w-[160px]"
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  }
                />
              }
            />
            <Bar dataKey={ativo} fill={`var(--color-${ativo})`} radius={4} />
          </BarChart>
        </ChartContainer>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(chartConfig) as Array<keyof typeof chartConfig>).map(
            (chave) => (
              <Badge
                key={chave}
                asChild
                variant={ativo === chave ? "default" : "outline"}
                className="cursor-pointer"
              >
                <button type="button" onClick={() => setAtivo(chave)}>
                  {chartConfig[chave].label}
                </button>
              </Badge>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
