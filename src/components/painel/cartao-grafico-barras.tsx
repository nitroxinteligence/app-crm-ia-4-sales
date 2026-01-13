"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SerieGraficoDetalhada } from "@/lib/types";

const chartConfig = {
  valor: {
    label: "Valor",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function CartaoGraficoBarras({
  serie,
}: {
  serie: SerieGraficoDetalhada;
}) {
  const chartData = serie.categorias.map((categoria, index) => ({
    categoria,
    valor: serie.valores[index] ?? 0,
  }));

  const isVertical = serie.layout === "vertical";

  return (
    <Card className="rounded-[6px] shadow-none">
      <CardHeader className="pb-2">
        <p className="text-sm font-medium">{serie.titulo}</p>
        <p className="text-xs text-muted-foreground">{serie.descricao}</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout={isVertical ? "vertical" : "horizontal"}
            margin={{ left: 8, right: 8 }}
          >
            <CartesianGrid
              stroke="var(--border)"
              strokeOpacity={0.35}
              horizontal={!isVertical}
              vertical={isVertical}
            />
            {isVertical ? (
              <>
                <YAxis
                  dataKey="categoria"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={96}
                  tick={{ fontSize: 10 }}
                />
                <XAxis dataKey="valor" type="number" hide />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="categoria"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tick={{ fontSize: 10 }}
                />
                <YAxis hide />
              </>
            )}
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
