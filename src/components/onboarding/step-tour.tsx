"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, LayoutDashboard, Inbox, Trello, Users, Calendar, BarChart3, Bot, Settings } from "lucide-react";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

interface StepTourProps {
    onFinish: () => void;
    loading: boolean;
}

const features = [
    {
        icon: LayoutDashboard,
        title: "Painel Geral",
        description: "Visão holística da sua operação. Acompanhe métricas vitais, desempenho da equipe e alertas importantes em tempo real.",
        color: "bg-blue-500/10 text-blue-500",
    },
    {
        icon: Inbox,
        title: "Inbox Omnichannel",
        description: "Centralize WhatsApp, Instagram, Messenger e Linkedin. Atenda seus clientes com rapidez, use respostas rápidas e transfira conversas.",
        color: "bg-purple-500/10 text-purple-500",
    },
    {
        icon: Trello,
        title: "Pipeline de Vendas",
        description: "Gerencie seus negócios em um quadro kanban visual. Arraste e solte para mover leads entre as etapas do funil.",
        color: "bg-emerald-500/10 text-emerald-500",
    },
    {
        icon: Users,
        title: "Gestão de Contatos",
        description: "CRM completo. Histórico de conversas, notas, tags e segmentação avançada para seus clientes e leads.",
        color: "bg-orange-500/10 text-orange-500",
    },
    {
        icon: Calendar,
        title: "Calendário & Tarefas",
        description: "Sincronização com Google Agenda. Agende reuniões e nunca perca um follow-up importante com nosso sistema de tarefas.",
        color: "bg-pink-500/10 text-pink-500",
    },
    {
        icon: BarChart3,
        title: "Relatórios Inteligentes",
        description: "KPIs detalhados e insights gerados por IA. Entenda o que funciona e otimize suas estratégias de vendas e atendimento.",
        color: "bg-indigo-500/10 text-indigo-500",
    },
    {
        icon: Bot,
        title: "Agentes de IA",
        description: "Configure SDRs e atendentes virtuais que trabalham 24/7. Automatize a qualificação e o suporte inicial nos canais conectados.",
        color: "bg-cyan-500/10 text-cyan-500",
    },
    {
        icon: Settings,
        title: "Configurações",
        description: "Personalize tudo. Respostas rápidas, motivos de perda, gestão de equipe e configurações avançadas do workspace.",
        color: "bg-slate-500/10 text-slate-500",
    },
];

export function StepTour({ onFinish, loading }: StepTourProps) {
    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center">
                <h3 className="text-xl font-semibold">Descubra o Poder da Plataforma</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Navegue pelos principais recursos e entenda como podemos transformar sua operação.
                </p>
            </div>

            <div className="relative px-8">
                <Carousel className="w-full max-w-2xl mx-auto">
                    <CarouselContent>
                        {features.map((feature, index) => (
                            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/2 p-2">
                                <div className="h-full border border-border/60 bg-white rounded-xl p-6 flex flex-col gap-4 hover:border-primary/30 transition-colors">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${feature.color}`}>
                                        <feature.icon className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-semibold">{feature.title}</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </div>

            <div className="flex justify-center pt-8">
                <Button onClick={onFinish} size="lg" className="px-8 min-w-[200px] h-12 text-base shadow-lg shadow-primary/20">
                    {loading ? (
                        "Finalizando..."
                    ) : (
                        <>
                            Continuar <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
