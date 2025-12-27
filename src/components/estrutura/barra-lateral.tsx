"use client";

import * as React from "react";
import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { itensNavegacao } from "@/lib/navegacao";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";

export function BarraLateral({
  colapsada,
  aoAlternar,
}: {
  colapsada: boolean;
  aoAlternar: () => void;
}) {
  const pathname = usePathname();
  const itensCore = itensNavegacao.filter((item) => item.grupo === "core");
  const itensAdmin = itensNavegacao.filter((item) => item.grupo === "admin");

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all",
        colapsada ? "w-20" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center px-4",
          colapsada ? "justify-start" : "justify-between"
        )}
      >
        {colapsada ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={aoAlternar}
            aria-label="Expandir barra lateral"
          >
            <PanelLeft className={cn("h-4 w-4", "rotate-180")} />
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                VP
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">VP CRM</p>
                <p className="text-xs text-muted-foreground">Vertical Partners</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={aoAlternar}
              aria-label="Recolher barra lateral"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <Separator />
      <TooltipProvider delayDuration={0}>
        <ScrollArea className="flex-1">
          <div className="px-3 py-4">
            <p
              className={cn(
                "px-3 text-xs font-semibold uppercase text-muted-foreground",
                colapsada && "sr-only"
              )}
            >
              Core
            </p>
            <div className="mt-2 space-y-1">
              {itensCore.map((item) => (
                <ItemNavegacao
                  key={item.id}
                  ativo={pathname.startsWith(item.href)}
                  colapsada={colapsada}
                  disponivel={item.disponivel}
                  href={item.href}
                  icone={item.icone}
                  titulo={item.titulo}
                />
              ))}
            </div>
            <p
              className={cn(
                "mt-6 px-3 text-xs font-semibold uppercase text-muted-foreground",
                colapsada && "sr-only"
              )}
            >
              Admin
            </p>
            <div className="mt-2 space-y-1">
              {itensAdmin.map((item) => (
                <ItemNavegacao
                  key={item.id}
                  ativo={pathname.startsWith(item.href)}
                  colapsada={colapsada}
                  disponivel={item.disponivel}
                  href={item.href}
                  icone={item.icone}
                  titulo={item.titulo}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </TooltipProvider>
    </aside>
  );
}

function ItemNavegacao({
  ativo,
  colapsada,
  disponivel,
  href,
  icone: Icone,
  titulo,
}: {
  ativo: boolean;
  colapsada: boolean;
  disponivel: boolean;
  href: string;
  icone: React.ElementType;
  titulo: string;
}) {
  const conteudo = (
    <Button
      variant={ativo ? "secondary" : "ghost"}
      className={cn(
        "h-10 w-full justify-start gap-3",
        colapsada && "justify-center",
        !disponivel && "cursor-not-allowed opacity-50"
      )}
      disabled={!disponivel}
    >
      <Icone className="h-4 w-4" />
      {!colapsada && <span className="text-sm">{titulo}</span>}
    </Button>
  );

  const item = disponivel ? (
    <Button
      asChild
      variant={ativo ? "secondary" : "ghost"}
      className={cn("h-10 w-full justify-start gap-3", colapsada && "justify-center")}
    >
      <Link
        href={href}
        className="text-sm"
      >
        <Icone className="h-4 w-4" />
        {!colapsada && <span className="text-sm">{titulo}</span>}
      </Link>
    </Button>
  ) : (
    conteudo
  );

  if (!colapsada) {
    return item;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{item}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {titulo}
      </TooltipContent>
    </Tooltip>
  );
}
