"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export default function VisualizarGatePage() {
    const router = useRouter();

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/20">
            <p className="text-muted-foreground">
                Esta página simula o bloqueio do plano trial.
                <br />O modal abaixo deve aparecer automaticamente.
            </p>

            <Dialog open={true} onOpenChange={() => { }}>
                <DialogContent className="max-w-md [&>button]:hidden">
                    <DialogHeader>
                        <DialogTitle>Seu plano PRO de testes acabou</DialogTitle>
                        <DialogDescription>
                            Seu trial de 30 dias expirou. Para continuar utilizando todas as
                            funcionalidades e liberar o acesso completo, você precisa escolher um
                            plano.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 pt-2">
                        <Button
                            size="lg"
                            className="w-full font-semibold"
                            onClick={() => router.replace("/planos")}
                        >
                            Escolher plano agora!
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
