"use client";

import { RadialBar, RadialBarChart } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type AtendenteItem = {
  nome: string;
  valor: number;
};

const cores = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

export function CartaoGraficoAtendentes({
  titulo,
  descricao,
  itens,
}: {
  titulo: string;
  descricao?: string;
  itens: AtendenteItem[];
}) {
  const topItens = [...itens]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  const chartConfig = topItens.reduce<ChartConfig>(
    (acc, item, index) => {
      const chave = `atendente-${index}`;
      acc[chave] = {
        label: item.nome,
        color: `var(--${cores[index] ?? "chart-1"})`,
      };
      return acc;
    },
    {
      valor: { label: "Negócios" },
    }
  );

  const chartData = topItens.map((item, index) => {
    const chave = `atendente-${index}`;
    return {
      nome: item.nome,
      valor: item.valor,
      fill: `var(--color-${chave})`,
    };
  });

  return (
    <Card className="rounded-[6px] shadow-none">
      <CardHeader className="space-y-1 pb-2">
        <p className="text-sm font-medium">{titulo}</p>
        {descricao && (
          <p className="text-xs text-muted-foreground">{descricao}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
          <ChartContainer
            config={chartConfig}
            className="mx-auto h-[240px] w-full max-w-[240px]"
          >
            <RadialBarChart
              data={chartData}
              innerRadius="45%"
              outerRadius="90%"
            >
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <RadialBar dataKey="valor" background cornerRadius={6} />
            </RadialBarChart>
          </ChartContainer>
          <div className="flex flex-col justify-center gap-2">
            {topItens.map((item, index) => {
              const chave = `atendente-${index}`;
              return (
                <div
                  key={item.nome}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-[6px]"
                      style={{ backgroundColor: `var(--color-${chave})` }}
                    />
                    <span className="text-muted-foreground">{item.nome}</span>
                  </div>
                  <span className="font-medium">{item.valor}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
