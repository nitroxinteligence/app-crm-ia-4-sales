import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type EstadoPainel = "loading" | "empty" | "error" | "denied";

export function EstadoPainel({ estado }: { estado: EstadoPainel }) {
  if (estado === "loading") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-64" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (estado === "empty") {
    return (
      <Card className="shadow-none">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold">Sem dados no período</p>
            <p className="text-sm text-muted-foreground">
              Ajuste os filtros para visualizar indicadores.
            </p>
          </div>
          <Button variant="outline">Ajustar filtros</Button>
        </CardContent>
      </Card>
    );
  }

  if (estado === "error") {
    return (
      <Card className="shadow-none">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
          <p className="text-lg font-semibold">Falha ao carregar o painel</p>
          <p className="text-sm text-muted-foreground">
            Tente novamente em instantes.
          </p>
          </div>
          <Button>Recarregar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-full bg-muted p-3">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-semibold">Permissão negada</p>
          <p className="text-sm text-muted-foreground">
            Seu perfil não tem acesso a este painel.
          </p>
        </div>
        <Button variant="outline">Solicitar acesso</Button>
      </CardContent>
    </Card>
  );
}
