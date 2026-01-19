"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAutenticacao } from "@/lib/contexto-autenticacao";

import { cn } from "@/lib/utils";

export function AvisoTrialFooter({ className }: { className?: string }) {
    const { workspace } = useAutenticacao();
    const [agora, setAgora] = React.useState<number>(0);

    React.useEffect(() => {
        setAgora(Date.now());
    }, []);

    const diasTrialRestantes = React.useMemo(() => {
        if (!workspace?.trialEndsAt) return null;
        if (!agora) return null;
        const end = new Date(workspace.trialEndsAt).getTime();
        const diff = Math.ceil((end - agora) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    }, [agora, workspace?.trialEndsAt]);

    // Only show if trialEndsAt exists and is in the future (or today)
    // If diasTrialRestantes is null, it means no trial date set (not trial)
    // Logic: "todos os usuários que estao no plano TRIAL"
    if (diasTrialRestantes === null) return null;

    return (
        <div
            className={cn(
                "fixed bottom-4 z-50 flex max-w-sm flex-col items-center gap-3 rounded-xl border bg-primary p-4 text-primary-foreground shadow-2xl sm:flex-row sm:gap-4 md:max-w-2xl",
                className
            )}
        >
            <p className="text-center text-sm font-medium">
                Você ainda tem {diasTrialRestantes} dias de testes no plano PRO.
                Aproveite!
            </p>
            <Button
                asChild
                variant="secondary"
                size="sm"
                className="whitespace-nowrap font-bold text-primary shadow-sm hover:bg-secondary/90"
            >
                <Link href="/planos">Escolher plano</Link>
            </Button>
        </div>
    );
}
