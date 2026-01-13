"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { tiposAgente } from "@/lib/config-agentes";
import { rotulosRotas } from "@/lib/navegacao";
import { obterRotuloRota } from "@/lib/idioma";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { supabaseClient } from "@/lib/supabase/client";

export function BreadcrumbApp() {
  const pathname = usePathname();
  const { idioma, workspace } = useAutenticacao();
  const [rotulosDinamicos, setRotulosDinamicos] = React.useState<
    Record<string, string>
  >({});

  const partes = React.useMemo(() => {
    return pathname
      .split("/")
      .filter(Boolean)
      .filter((parte) => parte !== "app");
  }, [pathname]);

  const agenteId = React.useMemo(() => {
    const indice = partes.indexOf("agentes");
    if (indice === -1) return null;
    const possivelId = partes[indice + 1];
    if (!possivelId || possivelId === "novo") return null;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(possivelId) ? possivelId : null;
  }, [partes]);

  React.useEffect(() => {
    if (!agenteId || !workspace?.id) return;
    if (rotulosDinamicos[agenteId]) return;
    let ativo = true;
    const carregarAgente = async () => {
      const { data } = await supabaseClient
        .from("agents")
        .select("nome, tipo")
        .eq("id", agenteId)
        .eq("workspace_id", workspace.id)
        .maybeSingle();
      if (!ativo || !data) return;
      const tipoLabel =
        tiposAgente.find((item) => item.value === data.tipo)?.label ?? data.tipo;
      const titulo = [data.nome, tipoLabel].filter(Boolean).join(" • ");
      setRotulosDinamicos((atual) => ({
        ...atual,
        [agenteId]: titulo || "Agente",
      }));
    };
    carregarAgente();
    return () => {
      ativo = false;
    };
  }, [agenteId, workspace?.id, rotulosDinamicos]);

  if (partes.length === 0) {
    return null;
  }

  const itens = partes.map((parte, index) => {
    const href = `/app/${partes.slice(0, index + 1).join("/")}`;
    const tituloBase = obterRotuloRota(
      idioma,
      parte,
      rotulosRotas[parte] ?? parte
    );
    const titulo =
      rotulosDinamicos[parte] ??
      (agenteId === parte ? "Agente" : tituloBase);
    const ultimo = index === partes.length - 1;

    return {
      href,
      titulo,
      ultimo,
    };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {itens.map((item, index) => (
          <React.Fragment key={item.href}>
            <BreadcrumbItem>
              {item.ultimo ? (
                <BreadcrumbPage>{item.titulo}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.titulo}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < itens.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
