"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles as SparklesComp } from "@/components/ui/sparkles";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { ToastAviso } from "@/components/ui/toast-aviso";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/lib/supabase/client";

type Periodo = "mensal" | "semestral" | "anual";

type Plano = {
  name: string;
  description: string;
  price: number;
  buttonText: string;
  buttonVariant: "outline" | "default";
  popular?: boolean;
  includes: string[];
};

const planos: Plano[] = [
  {
    name: "Essential",
    description: "Ideal para organizar o comercial e centralizar o atendimento.",
    price: 148,
    buttonText: "Escolher plano",
    buttonVariant: "outline",
    includes: [
      "O que você leva:",
      "Até 5 pipelines com até 10 etapas cada.",
      "Gestão de negócios (deals) e catálogo de produtos.",
      "Até 10.000 contatos, com tags e filtros.",
      "Apenas 1 workspace ativo por conta.",
      "Até 2 usuários/membros (equipe).",
      "Inbox omnichannel com até 2 canais conectados.",
      "Relatórios essenciais para acompanhamento do básico.",
    ],
  },
  {
    name: "Pro",
    description: "Para quem quer escala: atendimento + vendas com Agentes de IA.",
    price: 998,
    buttonText: "Escolher plano",
    buttonVariant: "default",
    popular: true,
    includes: [
      "O que você leva:",
      "Até 3 Agentes de IA (SDR, Atendimento, Suporte e outros).",
      "10.000 créditos/mês para uso dos Agentes de IA.",
      "Até 20 pipelines com até 15 etapas cada.",
      "Gestão de negócios completa e catálogo de produtos.",
      "Até 100.000 contatos com tags e organização avançada.",
      "Até 10 usuários/membros (equipe).",
      "3 workspaces ativos por conta.",
      "Inbox omnichannel com até 10 canais conectados.",
      "Relatórios avançados com KPIs e performance.",
    ],
  },
  {
    name: "Premium",
    description:
      "Operação completa para times maiores e alto volume, com IA em todo o CRM.",
    price: 1998,
    buttonText: "Escolher plano",
    buttonVariant: "outline",
    includes: [
      "O que você leva:",
      "Agentes de IA ilimitados (SDR, Atendimento, Suporte e outros).",
      "30.000 créditos/mês para uso dos Agentes de IA.",
      "Pipelines ilimitadas com até 25 etapas cada.",
      "Gestão de negócios completa e catálogo de produtos.",
      "Contatos ilimitados com tags e organização avançada.",
      "Até 20 usuários/membros (equipe).",
      "10 workspaces ativos por conta.",
      "Inbox omnichannel ilimitados.",
      "Relatórios avançados + insights com IA.",
    ],
  },
];

const PricingSwitch = ({
  selected,
  onSwitch,
}: {
  selected: Periodo;
  onSwitch: (value: Periodo) => void;
}) => {
  const handleSwitch = (value: Periodo) => {
    onSwitch(value);
  };

  return (
    <div className="flex justify-center">
      <div className="relative z-10 mx-auto flex w-fit rounded-full border border-neutral-700 bg-neutral-900 p-1">
        <button
          onClick={() => handleSwitch("mensal")}
          className={cn(
            "relative z-10 h-10 w-fit rounded-full px-4 py-1 text-sm font-medium transition-colors sm:px-6 sm:py-2",
            selected === "mensal" ? "text-white" : "text-gray-200"
          )}
        >
          {selected === "mensal" && (
            <motion.span
              layoutId="switch"
              className="absolute left-0 top-0 h-10 w-full rounded-full border-4 border-blue-600 bg-gradient-to-t from-blue-500 to-blue-600 shadow-sm shadow-blue-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">Mensal</span>
        </button>

        <button
          onClick={() => handleSwitch("semestral")}
          className={cn(
            "relative z-10 h-10 w-fit flex-shrink-0 rounded-full px-4 py-1 text-sm font-medium transition-colors sm:px-6 sm:py-2",
            selected === "semestral" ? "text-white" : "text-gray-200"
          )}
        >
          {selected === "semestral" && (
            <motion.span
              layoutId="switch"
              className="absolute left-0 top-0 h-10 w-full rounded-full border-4 border-blue-600 bg-gradient-to-t from-blue-500 to-blue-600 shadow-sm shadow-blue-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">Semestral</span>
        </button>

        <button
          onClick={() => handleSwitch("anual")}
          className={cn(
            "relative z-10 h-10 w-fit flex-shrink-0 rounded-full px-4 py-1 text-sm font-medium transition-colors sm:px-6 sm:py-2",
            selected === "anual" ? "text-white" : "text-gray-200"
          )}
        >
          {selected === "anual" && (
            <motion.span
              layoutId="switch"
              className="absolute left-0 top-0 h-10 w-full rounded-full border-4 border-blue-600 bg-gradient-to-t from-blue-500 to-blue-600 shadow-sm shadow-blue-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">Anual</span>
        </button>
      </div>
    </div>
  );
};

export default function PlanosPage() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>("anual");
  const [modalAberto, setModalAberto] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null);
  const [carregandoPlano, setCarregandoPlano] = useState<string | null>(null);
  const [toastMensagem, setToastMensagem] = useState<string | null>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const handleVoltar = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/app/configuracoes/cobranca");
  };

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.4,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  const formatarBRL = (valor: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);

  const obterPreco = (plan: Plano) => {
    if (periodo === "semestral") {
      const baseTotal = plan.price * 6;
      const total = Number((baseTotal * 0.9).toFixed(2));
      const mensal = Number((total / 6).toFixed(2));
      return {
        mensal,
        total,
        meses: 6,
        badge: "Semestral",
      };
    }
    if (periodo === "anual") {
      const baseTotal = plan.price * 12;
      const total = Number((baseTotal * 0.8).toFixed(2));
      const mensal = Number((total / 12).toFixed(2));
      return {
        mensal,
        total,
        meses: 12,
        badge: "Anual",
      };
    }
    return {
      mensal: plan.price,
      total: plan.price,
      meses: 1,
      badge: "Mensal",
    };
  };

  const selecionarPlano = async (plan: Plano) => {
    if (carregandoPlano) return;
    setToastMensagem(null);
    setCarregandoPlano(plan.name);
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setToastMensagem("Não foi possível validar sua sessão. Tente novamente.");
      setCarregandoPlano(null);
      return;
    }

    const response = await fetch("/api/plans/select", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan: plan.name, period: periodo }),
    });

    if (!response.ok) {
      const message = await response.text();
      setToastMensagem(message || "Falha ao atualizar o plano.");
      setCarregandoPlano(null);
      return;
    }

    setPlanoSelecionado(plan);
    setModalAberto(true);
    setCarregandoPlano(null);
  };

  useEffect(() => {
    if (!planoSelecionado) return;
    const timeout = setTimeout(() => {
      router.push("/app/painel");
    }, 10000);
    return () => clearTimeout(timeout);
  }, [planoSelecionado, router]);

  return (
    <div
      className="relative mx-auto min-h-screen overflow-x-hidden bg-black"
      ref={pricingRef}
    >
      <ToastAviso
        mensagem={toastMensagem}
        onClose={() => setToastMensagem(null)}
        variante="erro"
      />

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent
          overlayClassName="bg-black/50 backdrop-blur-sm"
          className="max-w-md border border-white/10 bg-neutral-950/90 text-white shadow-[0_0_120px_rgba(59,130,246,0.35)] [&>button]:hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-md bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500" />
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-semibold">
              Parabéns, seu plano foi ativado!
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-300">
              Você já pode aproveitar todos os recursos do plano{" "}
              <span className="font-semibold text-white">
                {planoSelecionado?.name ?? "selecionado"}
              </span>
              . Vamos te levar para o painel principal.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
              Tudo pronto
            </p>
            <p className="mt-2 text-sm text-gray-200">
              Ajuste a equipe, conecte canais e comece a operar com IA.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              onClick={() => router.push("/app/painel")}
            >
              Ir para o painel agora
            </Button>
            <span className="text-center text-xs text-gray-400">
              Você será redirecionado automaticamente em 10 segundos.
            </span>
          </div>
        </DialogContent>
      </Dialog>
      <TimelineContent
        animationNum={4}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="absolute top-0 h-96 w-screen overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff2c_1px,transparent_1px),linear-gradient(to_bottom,#3a3a3a01_1px,transparent_1px)] bg-[size:70px_80px]" />
        <SparklesComp
          density={1800}
          direction="bottom"
          speed={1}
          color="#FFFFFF"
          className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
        />
      </TimelineContent>
      <TimelineContent
        animationNum={5}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="absolute left-0 top-[-114px] h-[113.625vh] w-full flex-none overflow-hidden p-0"
      >
        <div className="relative h-full w-full">
          <div
            className="absolute left-[-568px] right-[-568px] top-0 h-[2053px] rounded-full"
            style={{
              border: "200px solid #3131f5",
              filter: "blur(92px)",
              WebkitFilter: "blur(92px)",
            }}
          />
          <div
            className="absolute left-[-568px] right-[-568px] top-0 h-[2053px] rounded-full"
            style={{
              border: "200px solid #3131f5",
              filter: "blur(92px)",
              WebkitFilter: "blur(92px)",
            }}
          />
        </div>
      </TimelineContent>

      <article className="relative z-50 mx-auto mb-6 max-w-3xl space-y-6 pt-24 text-center">
        <div className="flex justify-center pb-2">
          <Button
            variant="outline"
            className="text-xs uppercase tracking-[0.2em]"
            onClick={handleVoltar}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            VOLTAR
          </Button>
        </div>
        <h2 className="text-center text-4xl font-medium leading-tight text-white">
          <VerticalCutReveal
            splitBy="lines"
            staggerDuration={0.15}
            staggerFrom="first"
            reverse
            containerClassName="items-center justify-center text-center w-full"
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 40,
              delay: 0,
            }}
          >
            {"Planos que acompanham o ritmo\ndo seu time"}
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-gray-300"
        >
          Escolha o plano ideal para escalar vendas, atendimento e operação com
          agentes inteligentes.
        </TimelineContent>

        <TimelineContent
          as="div"
          animationNum={1}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="mt-6"
        >
          <PricingSwitch selected={periodo} onSwitch={setPeriodo} />
        </TimelineContent>
      </article>

      <div
        className="absolute left-[10%] right-[10%] top-0 h-full w-[80%] opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, #206ce8 0%, transparent 70%)",
          mixBlendMode: "multiply",
        }}
      />

      <div className="mx-auto grid max-w-5xl gap-4 py-6 md:grid-cols-3">
        {planos.map((plan, index) => {
          const preco = obterPreco(plan);
          const baseTotal = plan.price * preco.meses;
          const economia =
            periodo === "mensal"
              ? 0
              : Number((baseTotal - preco.total).toFixed(2));

          return (
            <TimelineContent
              key={plan.name}
              as="div"
              animationNum={2 + index}
              timelineRef={pricingRef}
              customVariants={revealVariants}
            >
              <Card
                className={`relative border-neutral-800 text-white ${
                  plan.popular
                    ? "bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 shadow-[0px_-13px_300px_0px_#0900ff] z-20"
                    : "bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 z-10"
                }`}
              >
                <CardHeader className="text-left">
                  {plan.popular && (
                    <span className="absolute right-4 top-4 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.55)]">
                      RECOMENDADO
                    </span>
                  )}
                  <div className="flex justify-between">
                    <h3 className="mb-2 text-3xl">{plan.name}</h3>
                  </div>
                  <p className="mb-2 text-sm text-gray-300">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3 border-t border-neutral-700 pt-4">
                    <h4 className="mb-3 text-base font-medium">
                      {plan.includes[0]}
                    </h4>
                    <ul className="space-y-2">
                      {plan.includes.slice(1).map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                          <span className="text-sm text-gray-300">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col items-start gap-3 border-t border-neutral-800 pt-4">
                  <div className="flex w-full items-center justify-between text-xs text-gray-300">
                    <span
                      className={cn(
                        "text-gray-500",
                        periodo !== "mensal" && "line-through"
                      )}
                    >
                      {periodo === "mensal" ? "" : formatarBRL(plan.price)}
                    </span>
                    {periodo !== "mensal" && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        Economize {formatarBRL(economia)}
                      </span>
                    )}
                  </div>
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-semibold text-white">
                        {formatarBRL(preco.mensal)}
                      </span>
                      <span className="text-xs text-gray-300">/mês</span>
                    </div>
                    <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] text-gray-300">
                      {preco.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Pagamento recorrente de {formatarBRL(preco.total)} a cada{" "}
                    {preco.meses === 1 ? "mês" : `${preco.meses} meses`}.
                  </p>
                  <button
                    className={`w-full rounded-xl p-4 text-lg ${
                      plan.popular
                        ? "bg-gradient-to-t from-blue-500 to-blue-600 shadow-lg shadow-blue-800 border border-blue-500 text-white"
                        : plan.buttonVariant === "outline"
                          ? "bg-gradient-to-t from-neutral-950 to-neutral-600 shadow-lg shadow-neutral-900 border border-neutral-800 text-white"
                          : ""
                    }`}
                    onClick={() => selecionarPlano(plan)}
                    disabled={carregandoPlano === plan.name}
                    aria-busy={carregandoPlano === plan.name}
                  >
                    {carregandoPlano === plan.name
                      ? "Ativando plano..."
                      : plan.buttonText}
                  </button>
                </CardFooter>
              </Card>
            </TimelineContent>
          );
        })}
      </div>
    </div>
  );
}
