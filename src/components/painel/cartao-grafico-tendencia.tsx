"use client";

import { CartesianGrid, LabelList, Line, LineChart } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SerieGrafico } from "@/lib/types";

const diasChave = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

const diasLabel: Record<string, string> = {
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
  dom: "Dom",
};

const chartConfig = {
  tendencia: {
    label: "Conversas",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function CartaoGraficoTendencia({ serie }: { serie: SerieGrafico }) {
  const chartData = serie.valores.map((valor, index) => ({
    dia: diasChave[index] ?? `d${index + 1}`,
    tendencia: valor,
  }));

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <p className="text-sm font-medium">{serie.titulo}</p>
        <p className="text-xs text-muted-foreground">Evolução semanal</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 24,
              left: 24,
              right: 24,
            }}
          >
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.35} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="tendencia"
              type="natural"
              stroke="var(--color-tendencia)"
              strokeWidth={2}
              dot={{ fill: "var(--color-tendencia)" }}
              activeDot={{ r: 6 }}
            >
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
                dataKey="dia"
                formatter={(value) => diasLabel[String(value)] ?? String(value)}
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
