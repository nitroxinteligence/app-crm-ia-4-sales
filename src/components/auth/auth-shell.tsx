"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type AuthShellProps = {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AuthShell({
  titulo,
  descricao,
  children,
  footer,
  className,
}: AuthShellProps) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a home
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
            VP
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold">{titulo}</h1>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">O que voce vai destravar</p>
            <ul className="mt-3 space-y-2 text-xs">
              <li>• Inbox omnichannel com IA e historico centralizado</li>
              <li>• Agentes inteligentes com follow-ups e governanca</li>
              <li>• Relatorios completos para vendas e atendimento</li>
            </ul>
          </div>
        </div>
        <Card className="shadow-none">
          <CardHeader className="space-y-1">
            <p className="text-sm font-semibold">{titulo}</p>
            <p className="text-xs text-muted-foreground">{descricao}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {children}
            {footer}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
