"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { texto } from "@/lib/idioma";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { supabaseClient } from "@/lib/supabase/client";

type MotivoPerdaItem = {
  id: string;
  titulo: string;
  obrigatorio: boolean;
  criadoEm: string;
};

const formatarData = (valor: string) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString("pt-BR");
};

export function VisaoMotivosPerdaConfiguracoes() {
  const { idioma } = useAutenticacao();
  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );
  const [busca, setBusca] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [dialogExcluir, setDialogExcluir] = React.useState(false);
  const [motivos, setMotivos] = React.useState<MotivoPerdaItem[]>([]);
  const [motivoEditando, setMotivoEditando] = React.useState<MotivoPerdaItem | null>(
    null
  );
  const [motivoExcluir, setMotivoExcluir] = React.useState<MotivoPerdaItem | null>(
    null
  );
  const [formTitulo, setFormTitulo] = React.useState("");
  const [formObrigatorio, setFormObrigatorio] = React.useState(false);

  const carregarMotivos = React.useCallback(async () => {
    setCarregando(true);
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setCarregando(false);
      return;
    }
    const response = await fetch("/api/pipeline/loss-reasons", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setCarregando(false);
      return;
    }
    const payload = (await response.json()) as {
      lossReasons?: MotivoPerdaItem[];
    };
    setMotivos(payload.lossReasons ?? []);
    setCarregando(false);
  }, []);

  React.useEffect(() => {
    void carregarMotivos();
  }, [carregarMotivos]);

  const motivosFiltrados = React.useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return motivos;
    return motivos.filter((item) => item.titulo.toLowerCase().includes(termo));
  }, [busca, motivos]);

  const abrirCriar = () => {
    setMotivoEditando(null);
    setFormTitulo("");
    setFormObrigatorio(false);
    setDialogAberto(true);
  };

  const abrirEditar = (item: MotivoPerdaItem) => {
    setMotivoEditando(item);
    setFormTitulo(item.titulo);
    setFormObrigatorio(item.obrigatorio);
    setDialogAberto(true);
  };

  const abrirExcluir = (item: MotivoPerdaItem) => {
    setMotivoExcluir(item);
    setDialogExcluir(true);
  };

  const handleSalvar = async () => {
    if (!formTitulo.trim()) return;
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    if (motivoEditando) {
      const response = await fetch("/api/pipeline/loss-reasons", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: motivoEditando.id,
          titulo: formTitulo.trim(),
          obrigatorio: formObrigatorio,
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          lossReason?: MotivoPerdaItem;
        };
        if (payload.lossReason) {
          setMotivos((atual) =>
            atual.map((item) =>
              item.id === payload.lossReason?.id ? payload.lossReason : item
            )
          );
        }
      }
    } else {
      const response = await fetch("/api/pipeline/loss-reasons", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo: formTitulo.trim(),
          obrigatorio: formObrigatorio,
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          lossReason?: MotivoPerdaItem;
        };
        const newReason = payload.lossReason;
        if (newReason) {
          setMotivos((atual) => [newReason, ...atual]);
        }
      }
    }
    setDialogAberto(false);
  };

  const handleExcluir = async () => {
    if (!motivoExcluir) return;
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const response = await fetch("/api/pipeline/loss-reasons", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: motivoExcluir.id }),
    });
    if (response.ok) {
      setMotivos((atual) => atual.filter((item) => item.id !== motivoExcluir.id));
      setDialogExcluir(false);
      setMotivoExcluir(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Motivos de perda dos negócios</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Descubra, organize e gerencie seus motivos de perda.",
              "Discover, organize and manage your loss reasons."
            )}
          </p>
        </div>
        <Button onClick={abrirCriar}>
          <Plus className="h-4 w-4" />
          Criar
        </Button>
      </div>

      <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar..."
              className="max-w-[260px] bg-white dark:bg-neutral-950"
            />
            <span className="text-sm text-muted-foreground">
              {motivosFiltrados.length} resultados
            </span>
          </div>

          <div className="grid gap-2">
            <div className="grid grid-cols-[36px_1fr_120px_120px_64px] items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <span />
              <span>Motivos de perda dos negócios</span>
              <span>Obrigatório</span>
              <span>Data de criação</span>
              <span />
            </div>
            {carregando
              ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`motivo-skeleton-${index}`}
                  className="grid grid-cols-[36px_1fr_120px_120px_64px] items-center gap-3 rounded-md border border-border/60 bg-white dark:bg-neutral-950 px-3 py-2"
                >
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              ))
              : motivosFiltrados.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[36px_1fr_120px_120px_64px] items-center gap-3 rounded-md border border-border/60 bg-white dark:bg-neutral-950 px-3 py-2"
                >
                  <Checkbox />
                  <span className="text-sm font-medium">{item.titulo}</span>
                  <Badge
                    variant="outline"
                    className={`w-fit ${item.obrigatorio
                      ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                      : "border-rose-300 bg-rose-50 text-rose-600"
                      }`}
                  >
                    {item.obrigatorio ? "Sim" : "Não"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatarData(item.criadoEm)}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirEditar(item)}
                            aria-label="Editar motivo"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirExcluir(item)}
                            aria-label="Excluir motivo"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {motivoEditando ? "Editar motivo" : "Novo motivo"}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Defina motivos padrão para analisar perdas.",
                "Define loss reasons to analyze outcomes."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nome do motivo</label>
              <Input
                value={formTitulo}
                onChange={(event) => setFormTitulo(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <span className="text-sm">Obrigatório</span>
              <Switch
                checked={formObrigatorio}
                onCheckedChange={setFormObrigatorio}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir motivo?</DialogTitle>
            <DialogDescription>
              {t(
                "Esta ação remove o motivo da lista.",
                "This removes the reason from the list."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setDialogExcluir(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
