"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { ModalWhatsappBaileys } from "@/components/integracoes/modal-whatsapp-baileys";

interface StepConnectionsProps {
    onNext: () => void;
    onPrev: () => void;
    workspaceId: string;
    session: any;
}

type StatusIntegracao = {
    connected: boolean;
    connectedAt?: string | null;
    account?: {
        nome?: string | null;
    } | null;
};

const appId = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID ?? "";
const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID ?? "";

export function StepConnections({
    onNext,
    onPrev,
    workspaceId,
    session,
}: StepConnectionsProps) {
    const [loading, setLoading] = React.useState(false);
    const [sdkReady, setSdkReady] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [statusWhatsapp, setStatusWhatsapp] = React.useState<StatusIntegracao | null>(null);
    const [statusInstagram, setStatusInstagram] = React.useState<StatusIntegracao | null>(null);
    const [baileysConnected, setBaileysConnected] = React.useState(false);

    const [modalBaileysOpen, setModalBaileysOpen] = React.useState(false);

    // Carregar SDK do Facebook
    React.useEffect(() => {
        if (typeof window === "undefined" || !appId) return;
        if (window.FB) {
            setSdkReady(true);
            return;
        }
        window.fbAsyncInit = () => {
            window.FB?.init({
                appId,
                cookie: true,
                xfbml: false,
                version: "v20.0",
            });
            setSdkReady(true);
        };
        const script = document.createElement("script");
        script.id = "facebook-jssdk";
        script.async = true;
        script.defer = true;
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        document.body.appendChild(script);
    }, []);

    // Polling de status
    const fetchStatus = React.useCallback(async () => {
        if (!workspaceId || !session) return;

        // WhatsApp Official
        try {
            const res = await fetch(`/api/integrations/whatsapp/status?workspaceId=${workspaceId}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) setStatusWhatsapp(await res.json());
        } catch { }

        // Instagram
        try {
            const res = await fetch(`/api/integrations/instagram/status?workspaceId=${workspaceId}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) setStatusInstagram(await res.json());
        } catch { }

        // Baileys
        try {
            const res = await fetch(`/api/integrations/whatsapp-baileys/status?workspaceId=${workspaceId}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
                const data = await res.json();
                const connected = data.accounts?.some((acc: any) => acc.status === "conectado");
                setBaileysConnected(Boolean(connected));
            }
        } catch { }
    }, [workspaceId, session]);

    React.useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleConnectOfficial = () => {
        if (!sdkReady || !window.FB) return;
        setLoading(true);
        window.FB.login(
            async (response: any) => {
                if (response.authResponse) {
                    try {
                        await fetch("/api/integrations/whatsapp/connect", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({
                                workspaceId,
                                code: response.authResponse.code,
                                accessToken: response.authResponse.accessToken,
                            }),
                        });
                        await fetchStatus();
                    } catch (err) {
                        setError("Falha ao conectar WhatsApp");
                    }
                }
                setLoading(false);
            },
            {
                config_id: configId,
                response_type: "code",
                override_default_response_type: true,
                scope: "whatsapp_business_management,whatsapp_business_messaging,business_management",
            }
        );
    };

    const handleConnectInstagram = () => {
        if (!sdkReady || !window.FB) return;
        setLoading(true);
        window.FB.login(
            async (response: any) => {
                if (response.authResponse) {
                    try {
                        await fetch("/api/integrations/instagram/connect", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({
                                workspaceId,
                                code: response.authResponse.code,
                                accessToken: response.authResponse.accessToken,
                            }),
                        });
                        await fetchStatus();
                    } catch (err) {
                        setError("Falha ao conectar Instagram");
                    }
                }
                setLoading(false);
            },
            {
                response_type: "code",
                override_default_response_type: true,
                scope: "instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement",
            }
        );
    };

    const channels = [
        {
            id: "whatsapp",
            title: "WhatsApp Oficial",
            description: "API Oficial da Meta. Mais estabilidade e recursos de IA. (Em Breve)",
            connected: false, // Force disabled for now
            action: handleConnectOfficial,
            premium: true,
            disabled: true,
        },
        {
            id: "instagram",
            title: "Instagram",
            description: "Direct Messages e comentários automatizados. (Em Breve)",
            connected: false, // Force disabled for now
            action: handleConnectInstagram,
            premium: false,
            disabled: true,
        },
        {
            id: "baileys",
            title: "WhatsApp QR Code",
            description: "Conexão via QR Code (Alternativa).",
            connected: baileysConnected,
            action: () => setModalBaileysOpen(true),
            premium: false,
            disabled: false,
        },
    ];

    return (
        <>
            <div className="space-y-8">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Conecte seus canais</h3>
                    <p className="text-sm text-muted-foreground">
                        Centralize seu atendimento conectando suas principais redes.
                        Recomendamos o WhatsApp Oficial para melhor performance.
                    </p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {channels.map((channel) => (
                        <Card
                            key={channel.id}
                            className={`p-6 flex flex-col justify-between gap-4 transition-all hover:border-primary/50 bg-white ${channel.connected ? "bg-primary/5 border-primary/20" : ""
                                }`}
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">{channel.title}</h4>
                                    {channel.connected ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    ) : channel.premium ? (
                                        <Badge variant="secondary" className="text-[10px]">Recomendado</Badge>
                                    ) : null}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {channel.description}
                                </p>
                            </div>

                            <Button
                                variant={channel.connected ? "outline" : "default"}
                                onClick={channel.action}
                                disabled={loading || channel.disabled}
                                className="w-full"
                            >
                                {loading && !channel.connected && !channel.disabled ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : channel.connected ? (
                                    "Gerenciar"
                                ) : channel.disabled ? (
                                    "Em breve"
                                ) : (
                                    "Conectar"
                                )}
                            </Button>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-between pt-4">
                    <Button variant="ghost" onClick={onPrev}>
                        Voltar
                    </Button>
                    <Button onClick={onNext} size="lg" className="min-w-[140px]">
                        Continuar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <ModalWhatsappBaileys
                aberto={modalBaileysOpen}
                aoMudar={setModalBaileysOpen}
                session={session}
                workspaceId={workspaceId}
                aoConectado={() => {
                    fetchStatus();
                    setModalBaileysOpen(false);
                }}
                aoAviso={(msg) => setError(msg)}
            />
        </>
    );
}
