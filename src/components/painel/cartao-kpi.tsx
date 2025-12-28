import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import type { KPI } from "@/lib/types";

export function CartaoKpi({ kpi }: { kpi: KPI }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {kpi.titulo}
        </p>
        {kpi.delta && (
          <CardAction className="self-center">
            <Badge variant="secondary" className="gap-1">
              <ArrowUpRight className="h-3 w-3" />
              {kpi.delta}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{kpi.valor}</p>
        {kpi.descricao && (
          <p className="mt-2 text-xs text-muted-foreground">{kpi.descricao}</p>
        )}
      </CardContent>
    </Card>
  );
}
