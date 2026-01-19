"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Crown, Gauge, Users, MessageSquare, Bot, Layers } from "lucide-react";

interface StepTrialProps {
    onFinish: () => void;
    loading: boolean;
}

export function StepTrial({ onFinish, loading }: StepTrialProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-4">
                    <Crown className="w-4 h-4" />
                    <span>Experiência Exclusiva</span>
                </div>
                <h3 className="text-3xl font-bold tracking-tight">Experimente o Plano PRO</h3>
                <p className="text-muted-foreground text-lg">
                    Desbloqueie todo o potencial da IA Four Sales por 30 dias.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4 p-6 bg-white border border-border/50 rounded-[6px] hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-[6px] bg-primary/10 text-primary">
                            <Gauge className="w-5 h-5" />
                        </div>
                        <h4 className="font-semibold">Performance Máxima</h4>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>10 Usuários inclusos</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>10 Canais de conexão</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>3 Agentes de IA</span>
                        </li>
                    </ul>
                </div>

                <div className="space-y-4 p-6 bg-white border border-border/50 rounded-[6px] hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-[6px] bg-primary/10 text-primary">
                            <Layers className="w-5 h-5" />
                        </div>
                        <h4 className="font-semibold">Recursos Avançados</h4>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>100.000 Contatos</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>20 Pipelines de Vendas</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>15 Etapas por Pipeline</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="bg-muted/30 border border-border/50 rounded-[6px] p-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Após os 30 dias de teste, você poderá escolher o plano ideal para sua operação.
                    <br className="hidden sm:inline" /> Nenhuma cobrança será realizada agora.
                </p>
            </div>

            <Button
                onClick={onFinish}
                disabled={loading}
                size="lg"
                className="w-full h-12 text-base font-medium rounded-[6px] shadow-none hover:shadow-lg hover:shadow-primary/20 transition-all"
            >
                {loading ? "Configurando..." : "Começar trial"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
        </div>
    );
}
