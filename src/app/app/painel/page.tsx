import { CabecalhoPainel } from "@/components/painel/cabecalho-painel";
import { CartaoKpi } from "@/components/painel/cartao-kpi";
import { CartaoGraficoFunil } from "@/components/painel/cartao-grafico-funil";
import { CartaoGraficoCanais } from "@/components/painel/cartao-grafico-canais";
import { CartaoGraficoTendencia } from "@/components/painel/cartao-grafico-tendencia";
import { AlertasAtivos } from "@/components/painel/alertas-ativos";
import { AcoesRapidas } from "@/components/painel/acoes-rapidas";
import {
  acoesRapidas,
  alertasPainel,
  kpisPainel,
  seriesCanais,
  seriesFunil,
  seriesTendencia,
} from "@/lib/mock/painel";
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

  return (
    <div className="space-y-6">
      <CabecalhoPainel />

      <section className="grid gap-4 lg:grid-cols-4">
        {kpisPainel.map((kpi) => (
          <CartaoKpi key={kpi.id} kpi={kpi} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <CartaoGraficoFunil serie={seriesFunil} />
        <CartaoGraficoCanais serie={seriesCanais} />
        <CartaoGraficoTendencia serie={seriesTendencia} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AlertasAtivos alertas={alertasPainel} />
        <AcoesRapidas acoes={acoesRapidas} />
      </section>
    </div>
  );
}
