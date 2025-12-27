import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SerieGrafico } from "@/lib/types";

export function CartaoGraficoFunil({ serie }: { serie: SerieGrafico }) {
  const maximo = Math.max(...serie.valores, 1);

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <p className="text-sm font-medium">{serie.titulo}</p>
        <p className="text-xs text-muted-foreground">
          Conversao por etapa (placeholder)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {serie.valores.map((valor, index) => {
            const largura = Math.round((valor / maximo) * 100);
            return (
              <div key={`${serie.id}-${index}`} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Etapa {index + 1}</span>
                  <span>{valor}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${largura}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
