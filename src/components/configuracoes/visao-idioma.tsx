"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { texto } from "@/lib/idioma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Idioma = "pt-BR" | "en-US";

export function VisaoIdiomaConfiguracoes() {
  const { idioma: idiomaApp, recarregar } = useAutenticacao();
  const [idioma, setIdioma] = React.useState<Idioma>("pt-BR");
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const t = React.useCallback(
    (pt: string, en: string) => texto(idiomaApp, pt, en),
    [idiomaApp]
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
      const response = await fetch("/api/settings/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const message = await response.text();
        setErro(message || t("Falha ao carregar idioma.", "Failed to load language."));
        setCarregando(false);
        return;
      }
      const payload = (await response.json()) as { profile: { idioma?: Idioma } };
      setIdioma(payload.profile?.idioma ?? "pt-BR");
      setCarregando(false);
    };
    void carregar();
  }, [obterToken, t]);

  const handleSalvar = async () => {
    setSalvando(true);
    setErro(null);
    const token = await obterToken();
    if (!token) {
      setErro(t("Sessão expirada.", "Session expired."));
      setSalvando(false);
      return;
    }
    const response = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idioma }),
    });
    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao salvar idioma.", "Failed to save language."));
      setSalvando(false);
      return;
    }
    await recarregar();
    setSalvando(false);
  };

  return (
    <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
      <div>
        <h2 className="text-lg font-semibold">{t("Idioma", "Language")}</h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "Defina a preferência de idioma para sua conta.",
            "Set your account language preference."
          )}
        </p>
      </div>

      {erro && (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          {carregando ? (
            <Skeleton className="h-9 w-[220px]" />
          ) : (
            <div className="space-y-3">
              <div className="max-w-xs">
                <Select value={idioma} onValueChange={(value) => setIdioma(value as Idioma)}>
                  <SelectTrigger className="gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
                    <SelectItem value="pt-BR">
                      {t("Português (Brasil)", "Portuguese (Brazil)")}
                    </SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {idioma === "pt-BR" ? "PT-BR" : "EN-US"}
                </Badge>
                <Button onClick={handleSalvar} disabled={salvando || carregando}>
                  {salvando ? t("Salvando...", "Saving...") : t("Salvar idioma", "Save language")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
