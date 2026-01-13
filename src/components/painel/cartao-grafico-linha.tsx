"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
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
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function CartaoGraficoLinha({
  serie,
}: {
  serie: SerieGraficoDetalhada;
}) {
  const chartData = serie.categorias.map((categoria, index) => ({
    categoria,
    valor: serie.valores[index] ?? 0,
  }));

  return (
    <Card className="rounded-[6px] shadow-none">
      <CardHeader className="pb-2">
        <p className="text-sm font-medium">{serie.titulo}</p>
        <p className="text-xs text-muted-foreground">{serie.descricao}</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <LineChart data={chartData} margin={{ left: 8, right: 8, top: 16 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.35} />
            <XAxis
              dataKey="categoria"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 10 }}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Line
              dataKey="valor"
              type="natural"
              stroke="var(--color-valor)"
              strokeWidth={2}
              dot={{ fill: "var(--color-valor)", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
