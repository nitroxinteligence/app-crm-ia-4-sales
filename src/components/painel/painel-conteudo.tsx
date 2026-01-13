"use client";

import * as React from "react";
import { differenceInCalendarDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CabecalhoPainel } from "@/components/painel/cabecalho-painel";
import { CartaoGraficoAtendimentos } from "@/components/painel/cartao-grafico-atendimentos";
import { CartaoGraficoAtendentes } from "@/components/painel/cartao-grafico-atendentes";
import { CartaoGraficoTempoResposta } from "@/components/painel/cartao-grafico-tempo-resposta";
import { CartaoGraficoTempoInicio } from "@/components/painel/cartao-grafico-tempo-inicio";
import { CartaoGraficoBarras } from "@/components/painel/cartao-grafico-barras";
import { CartaoKpi } from "@/components/painel/cartao-kpi";
import { formatarNumero } from "@/lib/formatadores";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import type { KPI, SerieGraficoDetalhada, SerieGraficoTemporal } from "@/lib/types";

const calcularDiasPeriodo = (periodo?: DateRange) => {
  if (!periodo?.from) {
    return 30;
  }

  const fim = periodo.to ?? periodo.from;
  return Math.max(1, differenceInCalendarDays(fim, periodo.from) + 1);
};

type DadosAtendimentos = {
  ultimaAtualizacao?: string | null;
  kpis: KPI[];
  series: {
    atendimentos: SerieGraficoTemporal;
    resolvidasPendentes: SerieGraficoTemporal;
    abertasSpam: SerieGraficoTemporal;
    porStatus: SerieGraficoDetalhada;
    porCanal: SerieGraficoDetalhada;
    atendentes: Array<{ nome: string; valor: number }>;
  };
};

const formatarDataISO = (data: Date) => data.toISOString().slice(0, 10);

export function PainelConteudo({
  aoAtualizarPeriodo,
  mostrarTitulo = true,
}: {
  aoAtualizarPeriodo?: (periodo?: DateRange) => void;
  mostrarTitulo?: boolean;
}) {
  const { workspace } = useAutenticacao();
  const periodoPadraoRef = React.useRef<DateRange | null>(null);
  const [periodo, setPeriodo] = React.useState<DateRange | undefined>(undefined);
  const [dados, setDados] = React.useState<DadosAtendimentos | null>(null);
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const diasSelecionados = React.useMemo(
    () => calcularDiasPeriodo(periodo),
    [periodo]
  );

  const handleAlterarPeriodo = (novoPeriodo?: DateRange) => {
    if (!novoPeriodo?.from) {
      setPeriodo(periodoPadraoRef.current ?? undefined);
      return;
    }

    setPeriodo(novoPeriodo);
  };

  const handleResetarPeriodo = () => {
    if (periodoPadraoRef.current) {
      setPeriodo(periodoPadraoRef.current);
    }
  };

  React.useEffect(() => {
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 29);
    const padrao: DateRange = { from: inicio, to: hoje };
    periodoPadraoRef.current = padrao;
    setPeriodo(padrao);
  }, []);

  React.useEffect(() => {
    if (!periodo?.from) return;
    aoAtualizarPeriodo?.(periodo);
  }, [aoAtualizarPeriodo, periodo]);

  React.useEffect(() => {
    const carregarDados = async () => {
      if (!workspace?.id || !periodo?.from) return;
      setCarregando(true);
      setErro(null);

      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) {
        setErro("Sessão expirada.");
        setCarregando(false);
        return;
      }

      const params = new URLSearchParams({
        workspaceId: workspace.id,
        from: formatarDataISO(periodo.from),
        to: formatarDataISO(periodo.to ?? periodo.from),
      });

      const response = await fetch(`/api/reports/atendimentos?${params}`, {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      if (!response.ok) {
        const message = await response.text();
        setErro(message || "Falha ao carregar relatórios.");
        setCarregando(false);
        return;
      }

      const payload = (await response.json()) as DadosAtendimentos;
      setDados(payload);
      setCarregando(false);
    };

    void carregarDados();
  }, [periodo, workspace?.id]);

  const kpis = React.useMemo(
    () =>
      (dados?.kpis ?? []).map((kpi) => ({
        ...kpi,
        valor: formatarNumero(Number(kpi.valor)),
        descricao: `${kpi.descricao} · ${diasSelecionados} dias`,
      })),
    [dados?.kpis, diasSelecionados]
  );

  return (
    <div className="space-y-6 [&_[data-slot=card]]:rounded-[6px]">
      <CabecalhoPainel
        periodo={periodo}
        diasSelecionados={diasSelecionados}
        aoAlterarPeriodo={handleAlterarPeriodo}
        aoResetarPeriodo={handleResetarPeriodo}
        ultimaAtualizacao={dados?.ultimaAtualizacao ?? null}
        mostrarTitulo={mostrarTitulo}
      />

      {erro ? (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-4">
        {(carregando && !dados ? Array.from({ length: 4 }) : kpis).map(
          (kpi, index) =>
            kpi ? (
              <CartaoKpi key={kpi.id} kpi={kpi} />
            ) : (
          <div
            key={`kpi-skeleton-${index}`}
            className="h-[120px] rounded-[6px] border border-border/60 bg-muted/30"
          />
        )
      )}
    </section>

      {dados ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <CartaoGraficoAtendimentos
            serie={dados.series.atendimentos}
            legendas={{ humano: "Recebidas", ia: "Enviadas" }}
          />
          <CartaoGraficoBarras serie={dados.series.porStatus} />
          <CartaoGraficoTempoResposta
            serie={dados.series.resolvidasPendentes}
            legendas={{ humano: "Resolvidas", ia: "Pendentes" }}
          />
          <CartaoGraficoTempoInicio
            serie={dados.series.abertasSpam}
            legendas={{ humano: "Abertas", ia: "Spam" }}
          />
          <CartaoGraficoBarras serie={dados.series.porCanal} />
          <CartaoGraficoAtendentes
            titulo="Atendimentos por atendente"
            descricao="Mensagens enviadas no período"
            itens={dados.series.atendentes}
          />
        </section>
      ) : null}
    </div>
  );
}
