import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AcaoRapida } from "@/lib/types";

export function AcoesRapidas({ acoes }: { acoes: AcaoRapida[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <p className="text-sm font-medium">Ações rápidas</p>
        <p className="text-xs text-muted-foreground">
          Atalhos para operações essenciais.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {acoes.map((acao) => (
          <div
            key={acao.id}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3"
          >
            <div>
              <p className="text-sm font-semibold">{acao.titulo}</p>
              <p className="text-xs text-muted-foreground">{acao.descricao}</p>
            </div>
            {acao.href ? (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={acao.href}>
                  Abrir
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="gap-2" disabled>
                Abrir
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
