"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INTERVALO_STATUS = 5000;

type StatusResposta = {
  connected?: boolean;
  status?: string | null;
  numero?: string | null;
  nome?: string | null;
  qrcode?: string | null;
};

type ConnectResposta = {
  integrationAccountId?: string;
  qrcode?: string | null;
  status?: string | null;
};

export function ModalWhatsappBaileys({
  aberto,
  aoMudar,
  session,
  workspaceId,
  integrationAccountId,
  forcarNovaInstancia = false,
  aoConectado,
  aoAviso,
}: {
  aberto: boolean;
  aoMudar: (valor: boolean) => void;
  session: Session | null;
  workspaceId: string | null;
  integrationAccountId?: string | null;
  forcarNovaInstancia?: boolean;
  aoConectado?: () => void;
  aoAviso?: (mensagem: string) => void;
}) {
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [qrcode, setQrcode] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [accountId, setAccountId] = React.useState<string | null>(null);
  const iniciouConexaoRef = React.useRef(false);
  const solicitacaoRef = React.useRef(false);
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null);
  const tentouForceNewRef = React.useRef(false);

  const normalizarStatus = React.useCallback(
    (valor?: string | null) => (valor ?? "").trim().toLowerCase(),
    []
  );

  const statusInfo = React.useMemo(() => {
    const statusAtual = normalizarStatus(status);
    const conectado = statusAtual === "conectado" || statusAtual === "connected";
    const desconectado =
      statusAtual === "desconectado" || statusAtual === "disconnected";
    const conectando =
      statusAtual === "conectando" ||
      statusAtual === "connecting" ||
      statusAtual === "connecting...";

    if (carregando) {
      return {
        badge: "secondary" as const,
        label: "Conectando",
        descricao: "Gerando QR Code e iniciando conexão.",
        dot: "bg-amber-500",
        pulse: true,
      };
    }

    if (conectado) {
      return {
        badge: "default" as const,
        label: "Conectado",
        descricao: "Conexão estabelecida.",
        dot: "bg-emerald-500",
        pulse: false,
      };
    }

    if (desconectado) {
      return {
        badge: "destructive" as const,
        label: "Desconectado",
        descricao: "Conexão não ativa.",
        dot: "bg-rose-500",
        pulse: false,
      };
    }

    if (conectando || qrcode) {
      return {
        badge: "secondary" as const,
        label: "Pendente",
        descricao: "Aguardando leitura do QR Code.",
        dot: "bg-amber-500",
        pulse: true,
      };
    }

    return {
      badge: "outline" as const,
      label: "Pendente",
      descricao: "Aguardando leitura do QR Code.",
      dot: "bg-muted-foreground/60",
      pulse: false,
    };
  }, [carregando, normalizarStatus, qrcode, status]);

  const limparPolling = React.useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const iniciarPolling = React.useCallback(
    (id: string) => {
      limparPolling();
      const consultarStatus = async () => {
        if (!session) return;
        let response: Response;
        try {
          response = await fetch(
            `/api/integrations/whatsapp-baileys/instance-status?integrationAccountId=${id}`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );
        } catch {
          setErro("Falha ao consultar status da conexao.");
          return;
        }

        if (!response.ok) {
          if (response.status === 401) {
            setErro("Sessão expirada. Faça login novamente.");
            limparPolling();
          } else if (response.status === 404) {
            setErro("Instância não encontrada. Tente novamente em instantes.");
            setQrcode(null);
            setStatus("desconectado");
            setAccountId(null);
            limparPolling();
          }
          return;
        }

        const data = (await response.json()) as StatusResposta;
        setQrcode(data?.qrcode ?? null);
        setStatus(data.status ?? null);

        const statusAtual = normalizarStatus(data.status ?? null);
        if (
          statusAtual === "desconectado" &&
          !data.connected &&
          !data.qrcode &&
          !tentouForceNewRef.current &&
          workspaceId
        ) {
          tentouForceNewRef.current = true;
          try {
            const reconnect = await fetch(
              "/api/integrations/whatsapp-baileys/connect",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  workspaceId,
                  integrationAccountId: id,
                  forceNew: true,
                }),
              }
            );
            if (reconnect.ok) {
              const payload = (await reconnect.json()) as ConnectResposta;
              setQrcode(payload.qrcode ?? null);
              setStatus(payload.status ?? "conectando");
            }
          } catch {
            setErro("Falha ao iniciar conexao.");
          }
          return;
        }

        if (data.connected) {
          limparPolling();
          aoConectado?.();
          aoMudar(false);
        }
      };
      void consultarStatus();
      pollingRef.current = setInterval(consultarStatus, INTERVALO_STATUS);
    },
    [aoConectado, aoMudar, limparPolling, normalizarStatus, session, workspaceId]
  );

  const iniciarConexao = React.useCallback(
    async (id?: string | null, forcarNova?: boolean) => {
      if (solicitacaoRef.current) return;
      if (iniciouConexaoRef.current && !forcarNova) return;
      solicitacaoRef.current = true;
      iniciouConexaoRef.current = true;
      if (!session || !workspaceId) {
        setErro("Autentique-se antes de conectar.");
        iniciouConexaoRef.current = false;
        solicitacaoRef.current = false;
        return;
      }

      setCarregando(true);
      setErro(null);

      let response: Response;
      try {
        response = await fetch(
          "/api/integrations/whatsapp-baileys/connect",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              workspaceId,
              ...(id ? { integrationAccountId: id } : {}),
              forceNew: forcarNova ?? forcarNovaInstancia ?? false,
            }),
          }
        );
      } catch {
        setErro("Falha ao iniciar conexao.");
        setCarregando(false);
        iniciouConexaoRef.current = false;
        solicitacaoRef.current = false;
        return;
      }

      if (!response.ok) {
        const mensagem = await response.text();
        setErro(mensagem || "Falha ao iniciar conexao.");
        setCarregando(false);
        iniciouConexaoRef.current = false;
        solicitacaoRef.current = false;
        if (response.status === 409 && aoAviso) {
          aoAviso(mensagem || "Sem instancias disponiveis no momento.");
        }
        return;
      }

      const payload = (await response.json()) as ConnectResposta;
      const novoId = payload.integrationAccountId ?? id ?? null;
      setAccountId(novoId);
      setQrcode(payload.qrcode ?? null);
      setStatus(payload.status ?? "conectando");
      setCarregando(false);
      solicitacaoRef.current = false;

      if (novoId) {
        iniciarPolling(novoId);
      }
    },
    [aoAviso, forcarNovaInstancia, iniciarPolling, session, workspaceId]
  );

  React.useEffect(() => {
    if (!aberto) {
      setErro(null);
      setQrcode(null);
      setStatus(null);
      setAccountId(null);
      setCarregando(false);
      iniciouConexaoRef.current = false;
      solicitacaoRef.current = false;
      tentouForceNewRef.current = false;
      limparPolling();
      return;
    }

    tentouForceNewRef.current = false;
    const idInicial = integrationAccountId ?? null;
    setAccountId(idInicial);
    void iniciarConexao(idInicial, forcarNovaInstancia);
  }, [
    aberto,
    forcarNovaInstancia,
    integrationAccountId,
    iniciarConexao,
    limparPolling,
  ]);

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent className="sm:max-w-[520px] rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
        <DialogHeader className="text-left">
          <DialogTitle>Conectar WhatsApp (API não oficial)</DialogTitle>
          <DialogDescription>
            Leia o QR Code com o WhatsApp que será usado no atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-[6px] border border-border/60 bg-muted/30 px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-[6px]",
                  statusInfo.dot,
                  statusInfo.pulse && "animate-pulse"
                )}
              />
              <div className="space-y-1">
                <p className="font-medium">Status da conexão</p>
                <p className="text-xs text-muted-foreground">
                  {statusInfo.descricao}
                </p>
              </div>
            </div>
            <Badge variant={statusInfo.badge}>{statusInfo.label}</Badge>
          </div>

          <div className="flex flex-col items-center justify-center rounded-[6px] border border-dashed border-border/60 bg-background/40 px-6 py-6 text-center">
            {qrcode ? (
              <img
                src={qrcode}
                alt="QRCode WhatsApp"
                className="h-52 w-52 rounded-[6px] border border-border/60 bg-background shadow-none transition-opacity"
              />
            ) : (
              <div className="flex h-52 w-52 flex-col items-center justify-center gap-2 rounded-[6px] border border-border/60 bg-muted/40 px-4 text-xs text-muted-foreground">
                <div
                  className={cn(
                    "h-16 w-16 rounded-[6px] bg-muted-foreground/10",
                    carregando && "animate-pulse"
                  )}
                />
                <span>
                  {carregando ? "Gerando QR Code..." : "Aguardando QR Code..."}
                </span>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {qrcode
                ? "Abra o WhatsApp > Aparelhos conectados > Conectar um aparelho."
                : "Assim que o QR estiver pronto, ele aparece aqui."}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Atualizamos o status a cada {INTERVALO_STATUS / 1000}s.
            </p>
          </div>

          {erro && (
            <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {erro}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" onClick={() => aoMudar(false)}>
            {carregando ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Conectando...
              </span>
            ) : status === "conectado" ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Concluído
              </span>
            ) : (
              "Fechar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
