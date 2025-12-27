import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SerieGrafico } from "@/lib/types";

export function CartaoGraficoTendencia({ serie }: { serie: SerieGrafico }) {
  const largura = 260;
  const altura = 120;
  const maximo = Math.max(...serie.valores, 1);
  const minimo = Math.min(...serie.valores, 0);
  const intervalo = maximo - minimo || 1;

  const pontos = serie.valores.map((valor, index) => {
    const x = (index / (serie.valores.length - 1 || 1)) * largura;
    const y = altura - ((valor - minimo) / intervalo) * altura;
    return { x, y };
  });

  const path = pontos
    .map((ponto, index) => `${index === 0 ? "M" : "L"}${ponto.x},${ponto.y}`)
    .join(" ");

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <p className="text-sm font-medium">{serie.titulo}</p>
        <p className="text-xs text-muted-foreground">
          Tendencia de conversas (placeholder)
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-border p-3">
          <svg
            viewBox={`0 0 ${largura} ${altura}`}
            className="h-32 w-full"
            aria-hidden
          >
            <path
              d={path}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
            />
            {pontos.map((ponto, index) => (
              <circle
                key={`${serie.id}-${index}`}
                cx={ponto.x}
                cy={ponto.y}
                r={3}
                fill="hsl(var(--primary))"
              />
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
