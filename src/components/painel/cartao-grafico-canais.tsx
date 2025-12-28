"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SerieGrafico } from "@/lib/types";

const canais = ["WhatsApp", "Instagram", "Messenger", "Email", "LinkedIn"];

const chartConfig = {
  humano: {
    label: "Humano",
    color: "var(--chart-1)",
  },
  ia: {
    label: "IA",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function CartaoGraficoCanais({ serie }: { serie: SerieGrafico }) {
  const chartData = canais.map((canal, index) => {
    const total = serie.valores[index] ?? 0;
    const humano = Math.round(total * 0.6);
    return {
      canal,
      humano,
      ia: Math.max(total - humano, 0),
    };
  });

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <p className="text-sm font-medium">{serie.titulo}</p>
        <p className="text-xs text-muted-foreground">
          Comparativo por canal
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid
              stroke="var(--border)"
              strokeOpacity={0.35}
              horizontal={false}
            />
            <XAxis
              dataKey="canal"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => String(value).slice(0, 3)}
            />
            <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
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
      </CardContent>
    </Card>
  );
}
