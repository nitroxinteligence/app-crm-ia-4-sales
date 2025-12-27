import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-border/60 bg-card p-10 text-center shadow-none">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
          VP
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">VP CRM</h1>
          <p className="text-sm text-muted-foreground">
            Experiencia omnichannel com agentes de IA. Frontend V1 em
            desenvolvimento.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/app/painel">Acessar Painel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
