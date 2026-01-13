"use client";

import dynamic from "next/dynamic";

const VisaoRelatorios = dynamic(
  () =>
    import("@/components/relatorios/visao-relatorios").then(
      (mod) => mod.VisaoRelatorios
    ),
  { ssr: false }
);

export function RelatoriosCliente() {
  return <VisaoRelatorios />;
}
