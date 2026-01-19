"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { texto } from "@/lib/idioma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type SettingsPrivacidade = {
  mascarar_viewer: boolean;
  retencao_dias: number;
};

const opcoesRetencao = [90, 180, 365];

export function VisaoPrivacidadeConfiguracoes() {
  const { usuario, idioma } = useAutenticacao();
  const [settings, setSettings] = React.useState<SettingsPrivacidade | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const isAdmin = usuario.role === "ADMIN";
  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );

  const obterToken = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  React.useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      const token = await obterToken();
      if (!token) {
        setErro(t("Sessão expirada.", "Session expired."));
        setCarregando(false);
        return;
      }
      const response = await fetch("/api/settings/privacy", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const message = await response.text();
        setErro(message || t("Falha ao carregar privacidade.", "Failed to load privacy settings."));
        setCarregando(false);
        return;
      }
      const payload = (await response.json()) as { settings: SettingsPrivacidade };
      setSettings(payload.settings);
      setCarregando(false);
    };
    void carregar();
  }, [obterToken, t]);

  const handleSalvar = async () => {
    if (!settings) return;
    setSalvando(true);
    setErro(null);
    const token = await obterToken();
    if (!token) {
      setErro(t("Sessão expirada.", "Session expired."));
      setSalvando(false);
      return;
    }
    const response = await fetch("/api/settings/privacy", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao salvar privacidade.", "Failed to save privacy settings."));
      setSalvando(false);
      return;
    }
    setSalvando(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {t("Privacidade & retenção", "Privacy & retention")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "Configure políticas de dados sensíveis do workspace.",
            "Configure workspace sensitive data policies."
          )}
        </p>
      </div>

      {erro && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
        <CardHeader>
          <CardTitle className="text-base">
            {t("Mascaramento de dados", "Data masking")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {carregando || !settings ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-white dark:bg-neutral-950 px-3 py-3 text-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {t("Ocultar dados para Viewer", "Hide data from Viewers")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Telefones e emails aparecem mascarados.",
                      "Phone numbers and emails are masked."
                    )}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.mascarar_viewer}
                onCheckedChange={(checked) =>
                  setSettings((atual) =>
                    atual ? { ...atual, mascarar_viewer: checked } : atual
                  )
                }
                disabled={!isAdmin}
              />
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              {t("Retenção de dados", "Data retention")}
            </label>
            {carregando || !settings ? (
              <Skeleton className="h-9 w-[200px]" />
            ) : (
              <Select
                value={String(settings.retencao_dias)}
                onValueChange={(value) =>
                  setSettings((atual) =>
                    atual ? { ...atual, retencao_dias: Number(value) } : atual
                  )
                }
                disabled={!isAdmin}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opcoesRetencao.map((dias) => (
                    <SelectItem key={dias} value={String(dias)}>
                      {dias} {t("dias", "days")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button
            onClick={handleSalvar}
            disabled={salvando || carregando || !isAdmin}
          >
            {salvando
              ? t("Salvando...", "Saving...")
              : t("Salvar configurações", "Save settings")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
