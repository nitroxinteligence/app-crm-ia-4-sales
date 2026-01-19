"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";

interface WorkspaceData {
    nome: string;
    segmento: string;
    tamanho_time: string;
    nomeUsuario: string;
}

interface StepWorkspaceProps {
    data: WorkspaceData;
    onUpdate: (data: Partial<WorkspaceData>) => void;
    onNext: () => void;
    loading: boolean;
}

const opcoesTime = [
    "1-3 pessoas",
    "4-10 pessoas",
    "11-25 pessoas",
    "26-50 pessoas",
    "50+ pessoas",
];

export function StepWorkspace({
    data,
    onUpdate,
    onNext,
    loading,
}: StepWorkspaceProps) {
    const isValid =
        data.nome.length > 2 &&
        data.segmento.length > 2 &&
        data.tamanho_time.length > 0 &&
        data.nomeUsuario.length > 2;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isValid) {
            onNext();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="nome">Nome da empresa</Label>
                    <Input
                        id="nome"
                        placeholder="Ex: Minha Empresa Ltda"
                        value={data.nome}
                        onChange={(e) => onUpdate({ nome: e.target.value })}
                        className="h-11"
                        autoFocus
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="nomeUsuario">Seu nome completo</Label>
                    <Input
                        id="nomeUsuario"
                        placeholder="Como devemos te chamar?"
                        value={data.nomeUsuario}
                        onChange={(e) => onUpdate({ nomeUsuario: e.target.value })}
                        className="h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="segmento">Segmento de atuação</Label>
                    <Input
                        id="segmento"
                        placeholder="Ex: SaaS, Varejo, Consultoria"
                        value={data.segmento}
                        onChange={(e) => onUpdate({ segmento: e.target.value })}
                        className="h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tamanho">Tamanho do time</Label>
                    <Select
                        value={data.tamanho_time}
                        onValueChange={(value) => onUpdate({ tamanho_time: value })}
                    >
                        <SelectTrigger id="tamanho" className="h-11">
                            <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                        <SelectContent>
                            {opcoesTime.map((opcao) => (
                                <SelectItem key={opcao} value={opcao}>
                                    {opcao}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    type="submit"
                    size="lg"
                    disabled={!isValid || loading}
                    className="min-w-[140px]"
                >
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            Continuar <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
