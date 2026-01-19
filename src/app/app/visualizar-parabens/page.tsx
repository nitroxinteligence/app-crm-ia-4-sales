"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function VisualizarParabensPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black text-white">
      <p className="text-center text-sm text-white/60">
        Página fictícia para visualizar o modal de parabéns.
      </p>

      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="max-w-md border border-white/10 bg-neutral-950/90 text-white shadow-[0_0_120px_rgba(59,130,246,0.35)] [&>button]:hidden">
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-md bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500" />
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-semibold">
              Parabéns, seu plano foi ativado!
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-300">
              Você já pode aproveitar todos os recursos do plano{" "}
              <span className="font-semibold text-white">Pro</span>. Vamos te
              levar para o painel principal.
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
              Você será redirecionado automaticamente em instantes.
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
