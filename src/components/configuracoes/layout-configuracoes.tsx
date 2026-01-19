"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Globe,
  Layers,
  MessageSquare,
  OctagonAlert,
  Package,
  Tag,
  User,
  Users,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { texto } from "@/lib/idioma";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type ItemMenu = {
  id: string;
  titulo: string;
  tituloEn: string;
  href: string;
  icone: React.ElementType;
  descricao?: string;
};

const grupos: Array<{ titulo: string; tituloEn: string; itens: ItemMenu[] }> = [
  {
    titulo: "Conta",
    tituloEn: "Account",
    itens: [
      {
        id: "perfil",
        titulo: "Perfil",
        tituloEn: "Profile",
        href: "/app/configuracoes/perfil",
        icone: User,
      },
      {
        id: "idioma",
        titulo: "Idioma",
        tituloEn: "Language",
        href: "/app/configuracoes/idioma",
        icone: Globe,
      },
    ],
  },
  {
    titulo: "Workspace",
    tituloEn: "Workspace",
    itens: [
      {
        id: "equipe",
        titulo: "Equipe",
        tituloEn: "Team",
        href: "/app/configuracoes/equipe",
        icone: Users,
      },
      {
        id: "workspaces",
        titulo: "Workspaces",
        tituloEn: "Workspaces",
        href: "/app/configuracoes/workspaces",
        icone: Layers,
      },
      {
        id: "integracoes",
        titulo: "Conexões",
        tituloEn: "Connections",
        href: "/app/configuracoes/conexoes",
        icone: Plug,
      },
      {
        id: "respostas-rapidas",
        titulo: "Respostas rápidas",
        tituloEn: "Quick replies",
        href: "/app/configuracoes/respostas-rapidas",
        icone: MessageSquare,
      },
      {
        id: "motivos-perda",
        titulo: "Motivos de perdas",
        tituloEn: "Loss reasons",
        href: "/app/configuracoes/motivos-perda",
        icone: OctagonAlert,
      },
      {
        id: "tags",
        titulo: "Tags",
        tituloEn: "Tags",
        href: "/app/configuracoes/tags",
        icone: Tag,
      },
      {
        id: "produtos",
        titulo: "Produtos",
        tituloEn: "Products",
        href: "/app/configuracoes/produtos",
        icone: Package,
      },
      {
        id: "cobranca",
        titulo: "Usos e planos",
        tituloEn: "Usage & plans",
        href: "/app/configuracoes/cobranca",
        icone: CreditCard,
      },
    ],
  },
];

export function LayoutConfiguracoes({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { idioma } = useAutenticacao();

  return (
    <div>
      <div className="grid lg:grid-cols-[240px_1fr]">
        <aside className="sticky top-0 h-screen self-start">
          <div className="-ml-6 h-full space-y-4 border-r border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50 py-4 pr-4 pl-6">
            {grupos.map((grupo, index) => (
              <div key={grupo.titulo} className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {texto(idioma, grupo.titulo, grupo.tituloEn)}
                </p>
                <div className="space-y-1">
                  {grupo.itens.map((item) => {
                    const ativo = pathname.startsWith(item.href);
                    const Icone = item.icone;
                    return (
                      <Button
                        key={item.id}
                        asChild
                        variant={ativo ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-2",
                          ativo && "font-semibold text-primary"
                        )}
                      >
                        <Link href={item.href}>
                          <Icone className="h-4 w-4" />
                          <span className="text-sm">
                            {texto(idioma, item.titulo, item.tituloEn)}
                          </span>
                        </Link>
                      </Button>
                    );
                  })}
                </div>
                {index < grupos.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </aside>

        <section className="space-y-6 p-6">{children}</section>
      </div>
    </div>
  );
}
