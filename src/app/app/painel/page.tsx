import { PainelConteudo } from "@/components/painel/painel-conteudo";
import { EstadoPainel } from "@/components/painel/estado-painel";

const estadosValidos = ["loading", "empty", "error", "denied"] as const;

type Estado = (typeof estadosValidos)[number];

export default function Page({
  searchParams,
}: {
  searchParams?: { estado?: string };
}) {
  const estado = searchParams?.estado;
  const estadoNormalizado = estadosValidos.includes(estado as Estado)
    ? (estado as Estado)
    : null;

  if (estadoNormalizado) {
    return <EstadoPainel estado={estadoNormalizado} />;
  }

  return <PainelConteudo />;
}
