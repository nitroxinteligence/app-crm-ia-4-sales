"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SerieGrafico } from "@/lib/types";

const chartConfig = {
  valor: {
    label: "Leads",
    color: "var(--chart-2)",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig;

export function CartaoGraficoFunil({ serie }: { serie: SerieGrafico }) {
  const chartData = serie.valores.map((valor, index) => ({
    etapa: `Etapa ${index + 1}`,
    valor,
  }));

  return (
    <Card className="rounded-[6px] shadow-none">
      <CardHeader className="pb-2">
        <p className="text-sm font-medium">{serie.titulo}</p>
        <p className="text-xs text-muted-foreground">
          Conversão por etapa
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ right: 16 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="var(--border)"
              strokeOpacity={0.35}
            />
            <YAxis
              dataKey="etapa"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              hide
            />
            <XAxis dataKey="valor" type="number" hide />
            <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
            <Bar dataKey="valor" layout="vertical" fill="var(--color-valor)" radius={4}>
              <LabelList
                dataKey="etapa"
                position="insideLeft"
                offset={8}
                className="fill-[var(--color-label)]"
                fontSize={12}
              />
              <LabelList
                dataKey="valor"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
