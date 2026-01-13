import { AlertTriangle, BellRing, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AlertaPainel } from "@/lib/types";
import { SomAlerta } from "@/components/painel/som-alerta";

const icones = {
  critico: ShieldAlert,
  atencao: AlertTriangle,
  info: BellRing,
};

export function AlertasAtivos({ alertas }: { alertas: AlertaPainel[] }) {
  const alertasAtivos = alertas.filter((alerta) => alerta.ativo);

  return (
    <Card className="rounded-[6px] shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Alertas ativos</p>
            <p className="text-xs text-muted-foreground">
              Priorize as conversas mais urgentes.
            </p>
          </div>
          <Badge variant="outline">{alertasAtivos.length} ativos</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SomAlerta ativo={alertasAtivos.length > 0} />
        {alertasAtivos.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum alerta pendente no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {alertasAtivos.map((alerta) => {
              const Icone = icones[alerta.tipo];
              return (
                <div
                  key={alerta.id}
                  className="flex items-start gap-3 rounded-[6px] border border-border/60 bg-muted/40 p-3"
                >
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                    <Icone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{alerta.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {alerta.descricao}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
