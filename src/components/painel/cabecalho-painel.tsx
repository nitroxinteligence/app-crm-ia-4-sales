"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarDays, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function CabecalhoPainel({
  periodo,
  diasSelecionados,
  aoAlterarPeriodo,
  aoResetarPeriodo,
  mostrarTitulo = true,
}: {
  periodo?: DateRange;
  diasSelecionados: number;
  aoAlterarPeriodo: (periodo?: DateRange) => void;
  aoResetarPeriodo: () => void;
  ultimaAtualizacao?: string | null;
  mostrarTitulo?: boolean;
}) {
  const periodoTexto = periodo?.from
    ? periodo.to
      ? `${format(periodo.from, "dd MMM yyyy", { locale: ptBR })} - ${format(
          periodo.to,
          "dd MMM yyyy",
          { locale: ptBR }
        )}`
      : format(periodo.from, "dd MMM yyyy", { locale: ptBR })
    : "Selecione o período";

  const seletorPeriodo = (
    <div className="flex flex-wrap items-center gap-3 rounded-[6px] border border-border/60 bg-card/40 px-3 py-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span>Período</span>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-empty={!periodo?.from}
            className={cn(
              "h-9 w-[260px] justify-start rounded-[6px] text-left font-normal data-[empty=true]:text-muted-foreground"
            )}
          >
            {periodoTexto}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={periodo?.from}
            selected={periodo}
            onSelect={aoAlterarPeriodo}
            weekStartsOn={1}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon"
        onClick={aoResetarPeriodo}
        aria-label="Resetar período"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground">
        {diasSelecionados} dias
      </span>
    </div>
  );

  return (
    <div className="space-y-3">
      {mostrarTitulo ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Visão Geral</h1>
          {seletorPeriodo}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {seletorPeriodo}
        </div>
      )}
    </div>
  );
}
