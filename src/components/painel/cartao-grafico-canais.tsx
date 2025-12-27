import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SerieGrafico } from "@/lib/types";

const labels = ["WhatsApp", "Instagram", "Messenger", "Email", "LinkedIn"];

export function CartaoGraficoCanais({ serie }: { serie: SerieGrafico }) {
  const maximo = Math.max(...serie.valores, 1);

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <p className="text-sm font-medium">{serie.titulo}</p>
        <p className="text-xs text-muted-foreground">
          Distribuicao por canal (placeholder)
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex h-36 items-end gap-3">
          {serie.valores.map((valor, index) => {
            const altura = Math.max(12, Math.round((valor / maximo) * 120));
            return (
              <div key={`${serie.id}-${index}`} className="flex-1">
                <div className="rounded-lg bg-primary/20">
                  <div
                    className="w-full rounded-lg bg-primary"
                    style={{ height: `${altura}px` }}
                  />
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  {labels[index] ?? `Canal ${index + 1}`}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
