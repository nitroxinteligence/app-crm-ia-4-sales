"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { texto } from "@/lib/idioma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type EntidadeCampo = "lead" | "deal";
type TipoCampo =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "select"
  | "multi-select"
  | "boolean";

type CampoCustomizado = {
  id: string;
  nome: string;
  tipo: TipoCampo;
  opcoes?: string[] | null;
  obrigatorio: boolean;
  ordem: number;
};

const tiposLabel: Record<TipoCampo, string> = {
  text: "Texto",
  number: "Número",
  currency: "Moeda",
  date: "Data",
  select: "Seleção única",
  "multi-select": "Seleção múltipla",
  boolean: "Sim/Não",
};

const tiposLabelEn: Record<TipoCampo, string> = {
  text: "Text",
  number: "Number",
  currency: "Currency",
  date: "Date",
  select: "Single select",
  "multi-select": "Multi select",
  boolean: "Yes/No",
};

const entidadeLabel: Record<EntidadeCampo, string> = {
  lead: "Leads",
  deal: "Negócios",
};

const parseOpcoes = (texto: string) =>
  texto
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const formatarOpcoes = (opcoes?: string[] | null) =>
  (opcoes ?? []).join("\n");

export function VisaoCamposConfiguracoes() {
  const { usuario, idioma } = useAutenticacao();
  const [entidade, setEntidade] = React.useState<EntidadeCampo>("lead");
  const [campos, setCampos] = React.useState<Record<EntidadeCampo, CampoCustomizado[]>>({
    lead: [],
    deal: [],
  });
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [dialogExcluir, setDialogExcluir] = React.useState(false);
  const [campoEditando, setCampoEditando] = React.useState<CampoCustomizado | null>(
    null
  );
  const [campoExcluir, setCampoExcluir] = React.useState<CampoCustomizado | null>(
    null
  );
  const [formNome, setFormNome] = React.useState("");
  const [formTipo, setFormTipo] = React.useState<TipoCampo>("text");
  const [formObrigatorio, setFormObrigatorio] = React.useState(false);
  const [formOpcoes, setFormOpcoes] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const podeEditar = usuario.role === "ADMIN";
  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );
  const tiposAtuais = idioma === "en-US" ? tiposLabelEn : tiposLabel;

  const obterToken = React.useCallback(async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const carregarCampos = React.useCallback(
    async (tipo: EntidadeCampo) => {
      setCarregando(true);
      setErro(null);
      const token = await obterToken();
      if (!token) {
        setErro(t("Sessão expirada.", "Session expired."));
        setCarregando(false);
        return;
      }
      const response = await fetch(`/api/settings/fields?entity=${tipo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const message = await response.text();
        setErro(message || t("Falha ao carregar campos.", "Failed to load fields."));
        setCarregando(false);
        return;
      }
      const payload = (await response.json()) as { fields: CampoCustomizado[] };
      setCampos((atual) => ({
        ...atual,
        [tipo]: payload.fields ?? [],
      }));
      setCarregando(false);
    },
    [obterToken, t]
  );

  React.useEffect(() => {
    void carregarCampos(entidade);
  }, [carregarCampos, entidade]);

  const abrirNovoCampo = () => {
    setCampoEditando(null);
    setFormNome("");
    setFormTipo("text");
    setFormObrigatorio(false);
    setFormOpcoes("");
    setDialogAberto(true);
  };

  const abrirEditarCampo = (campo: CampoCustomizado) => {
    setCampoEditando(campo);
    setFormNome(campo.nome);
    setFormTipo(campo.tipo);
    setFormObrigatorio(campo.obrigatorio);
    setFormOpcoes(formatarOpcoes(campo.opcoes));
    setDialogAberto(true);
  };

  const handleSalvarCampo = async () => {
    if (!formNome.trim()) return;
    setSalvando(true);
    const token = await obterToken();
    if (!token) {
      setSalvando(false);
      return;
    }
    const opcoes = ["select", "multi-select"].includes(formTipo)
      ? parseOpcoes(formOpcoes)
      : [];

    const endpoint = campoEditando
      ? `/api/settings/fields/${campoEditando.id}`
      : "/api/settings/fields";
    const method = campoEditando ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity: entidade,
        nome: formNome.trim(),
        tipo: formTipo,
        obrigatorio: formObrigatorio,
        opcoes,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao salvar campo.", "Failed to save field."));
      setSalvando(false);
      return;
    }

    const payload = (await response.json()) as { field: CampoCustomizado };
    setCampos((atual) => {
      const lista = atual[entidade];
      const atualizada = campoEditando
        ? lista.map((item) => (item.id === payload.field.id ? payload.field : item))
        : [payload.field, ...lista];
      return {
        ...atual,
        [entidade]: atualizada.sort((a, b) => a.ordem - b.ordem),
      };
    });
    setDialogAberto(false);
    setSalvando(false);
  };

  const handleExcluirCampo = async () => {
    if (!campoExcluir) return;
    const token = await obterToken();
    if (!token) return;
    const response = await fetch(
      `/api/settings/fields/${campoExcluir.id}?entity=${entidade}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) {
      const message = await response.text();
      setErro(message || t("Falha ao excluir campo.", "Failed to delete field."));
      return;
    }
    setCampos((atual) => ({
      ...atual,
      [entidade]: atual[entidade].filter((item) => item.id !== campoExcluir.id),
    }));
    setCampoExcluir(null);
    setDialogExcluir(false);
  };

  const handleMoverCampo = async (index: number, direcao: "up" | "down") => {
    const lista = campos[entidade];
    const novoIndex = direcao === "up" ? index - 1 : index + 1;
    if (novoIndex < 0 || novoIndex >= lista.length) return;
    const atual = lista[index];
    const alvo = lista[novoIndex];
    const token = await obterToken();
    if (!token) return;

    const atualizarCampo = async (id: string, ordem: number) =>
      fetch(`/api/settings/fields/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entity: entidade, ordem }),
      });

    await Promise.all([
      atualizarCampo(atual.id, alvo.ordem),
      atualizarCampo(alvo.id, atual.ordem),
    ]);

    setCampos((prev) => {
      const copia = [...prev[entidade]];
      copia[index] = { ...atual, ordem: alvo.ordem };
      copia[novoIndex] = { ...alvo, ordem: atual.ordem };
      copia.sort((a, b) => a.ordem - b.ordem);
      return { ...prev, [entidade]: copia };
    });
  };

  const camposAtivos = campos[entidade];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {t("Campos customizados", "Custom fields")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Personalize dados de leads e negócios.",
              "Customize data for leads and deals."
            )}
          </p>
        </div>
        <Button className="gap-2" onClick={abrirNovoCampo} disabled={!podeEditar}>
          <Plus className="h-4 w-4" />
          {t("Novo campo", "New field")}
        </Button>
      </div>

      {erro && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}
      {!podeEditar && (
        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t(
            "Apenas Admin ou Manager podem editar campos customizados.",
            "Only Admins or Managers can edit custom fields."
          )}
        </div>
      )}

      <Tabs value={entidade} onValueChange={(value) => setEntidade(value as EntidadeCampo)}>
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="lead">{t("Leads", "Leads")}</TabsTrigger>
          <TabsTrigger value="deal">{t("Negócios", "Deals")}</TabsTrigger>
        </TabsList>

        <TabsContent value={entidade} className="pt-4">
          <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {texto(
                  idioma,
                  entidadeLabel[entidade],
                  entidade === "lead" ? "Leads" : "Deals"
                )}
              </CardTitle>
              <Badge variant="outline">
                {camposAtivos.length} {t("campos", "fields")}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {carregando ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : camposAtivos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t(
                    `Nenhum campo customizado para ${entidadeLabel[entidade].toLowerCase()}.`,
                    `No custom fields for ${entidade === "lead" ? "leads" : "deals"}.`
                  )}
                </p>
              ) : (
                camposAtivos.map((campo, index) => (
                  <div
                    key={campo.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{campo.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {tiposAtuais[campo.tipo]}
                        {campo.obrigatorio
                          ? texto(idioma, " · Obrigatório", " · Required")
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoverCampo(index, "up")}
                        disabled={!podeEditar || index === 0}
                        aria-label={t("Mover para cima", "Move up")}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoverCampo(index, "down")}
                        disabled={!podeEditar || index === camposAtivos.length - 1}
                        aria-label={t("Mover para baixo", "Move down")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEditarCampo(campo)}
                        disabled={!podeEditar}
                      >
                        {t("Editar", "Edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setCampoExcluir(campo);
                          setDialogExcluir(true);
                        }}
                        aria-label={t("Excluir campo", "Delete field")}
                        disabled={!podeEditar}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {campoEditando ? t("Editar campo", "Edit field") : t("Novo campo", "New field")}
            </DialogTitle>
            <DialogDescription>
              {t(
                `Defina os dados personalizados para ${entidadeLabel[entidade].toLowerCase()}.`,
                `Define custom data for ${entidade === "lead" ? "leads" : "deals"}.`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("Nome do campo", "Field name")}
              </label>
              <Input
                value={formNome}
                onChange={(event) => setFormNome(event.target.value)}
                placeholder={t("Ex: Segmento, Score, Produto", "Ex: Segment, Score, Product")}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("Tipo", "Type")}</label>
              <Select
                value={formTipo}
                onValueChange={(value) => setFormTipo(value as TipoCampo)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tiposAtuais).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {["select", "multi-select"].includes(formTipo) && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t("Opções", "Options")}</label>
                <Textarea
                  value={formOpcoes}
                  onChange={(event) => setFormOpcoes(event.target.value)}
                  placeholder={t("Uma opção por linha", "One option per line")}
                  className="min-h-[120px]"
                />
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{t("Obrigatório", "Required")}</p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Campo necessário nos formulários.",
                    "Field required in forms."
                  )}
                </p>
              </div>
              <Switch
                checked={formObrigatorio}
                onCheckedChange={setFormObrigatorio}
              />
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              {t("Ordem atual:", "Current order:")}{" "}
              {camposAtivos.length + (campoEditando ? 0 : 1)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogAberto(false)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button onClick={handleSalvarCampo} disabled={salvando || !podeEditar}>
              {salvando ? t("Salvando...", "Saving...") : t("Salvar", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Excluir campo", "Delete field")}</DialogTitle>
            <DialogDescription>
              {t(
                "Essa ação remove o campo e seus valores associados.",
                "This action removes the field and its associated values."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogExcluir(false)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleExcluirCampo}>
              {t("Excluir", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
