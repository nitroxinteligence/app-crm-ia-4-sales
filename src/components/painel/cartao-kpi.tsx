import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MessageCircle,
  MessagesSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import type { KPI } from "@/lib/types";

const iconesKpi = {
  "kpi-total-atendimentos": MessagesSquare,
  "kpi-encerrados": CheckCircle2,
  "kpi-conversas-iniciadas": MessageCircle,
  "kpi-conversas-aguardando": Clock,
} as const;

export function CartaoKpi({ kpi }: { kpi: KPI }) {
  const Icone = iconesKpi[kpi.id as keyof typeof iconesKpi];

  return (
    <Card className="rounded-[6px] shadow-none">
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-tight">{kpi.valor}</p>
            {kpi.descricao && (
              <p className="mt-2 text-xs text-muted-foreground">
                {kpi.descricao}
              </p>
            )}
          </div>
          {Icone ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-border/60 text-primary">
              <Icone className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
