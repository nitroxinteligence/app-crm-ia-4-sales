"use client";

import * as React from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { texto } from "@/lib/idioma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type TagItem = {
  id: string;
  nome: string;
  cor?: string | null;
};

const corPadrao = "#94a3b8";

// Curated color palette matching the app's visual style
const paletaCores = [
  // Reds
  "#ef4444", "#dc2626", "#f87171",
  // Oranges
  "#f97316", "#ea580c", "#fb923c",
  // Ambers/Yellows
  "#eab308", "#f59e0b", "#fbbf24",
  // Greens
  "#22c55e", "#16a34a", "#4ade80",
  // Teals
  "#14b8a6", "#0d9488", "#2dd4bf",
  // Blues
  "#3b82f6", "#2563eb", "#60a5fa",
  // Indigos
  "#6366f1", "#4f46e5", "#818cf8",
  // Purples
  "#a855f7", "#9333ea", "#c084fc",
  // Pinks
  "#ec4899", "#db2777", "#f472b6",
  // Grays
  "#64748b", "#475569", "#94a3b8",
];

export function VisaoTagsConfiguracoes() {
  const { workspace, idioma } = useAutenticacao();
  const [tags, setTags] = React.useState<TagItem[]>([]);
  const [busca, setBusca] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [removendo, setRemovendo] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [dialogExcluir, setDialogExcluir] = React.useState(false);
  const [tagEditando, setTagEditando] = React.useState<TagItem | null>(null);
  const [tagExcluir, setTagExcluir] = React.useState<TagItem | null>(null);
  const [formNome, setFormNome] = React.useState("");
  const [formCor, setFormCor] = React.useState(corPadrao);
  const [paletaExpandida, setPaletaExpandida] = React.useState(false);

  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );

  const carregarTags = React.useCallback(async () => {
    if (!workspace.id) return;
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabaseClient
      .from("tags")
      .select("id, nome, cor")
      .eq("workspace_id", workspace.id)
      .order("nome", { ascending: true });

    if (error) {
      setErro(t("Falha ao carregar tags.", "Failed to load tags."));
      setCarregando(false);
      return;
    }

    setTags((data ?? []) as TagItem[]);
    setCarregando(false);
  }, [t, workspace.id]);

  React.useEffect(() => {
    void carregarTags();
  }, [carregarTags]);

  const tagsFiltradas = React.useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return tags;
    return tags.filter((tag) => tag.nome.toLowerCase().includes(termo));
  }, [busca, tags]);

  const abrirNovaTag = () => {
    setTagEditando(null);
    setFormNome("");
    setFormCor(corPadrao);
    setDialogAberto(true);
  };

  const abrirEditarTag = (tag: TagItem) => {
    setTagEditando(tag);
    setFormNome(tag.nome);
    setFormCor(tag.cor ?? corPadrao);
    setDialogAberto(true);
  };

  const abrirExcluirTag = (tag: TagItem) => {
    setTagExcluir(tag);
    setDialogExcluir(true);
  };

  const handleSalvar = async () => {
    if (!workspace.id) return;
    if (!formNome.trim()) {
      setErro(t("Informe o nome da tag.", "Provide a tag name."));
      return;
    }
    setSalvando(true);
    setErro(null);

    const payload = {
      nome: formNome.trim(),
      cor: formCor || corPadrao,
    };

    const response = tagEditando
      ? await supabaseClient
        .from("tags")
        .update(payload)
        .eq("id", tagEditando.id)
      : await supabaseClient
        .from("tags")
        .insert({ ...payload, workspace_id: workspace.id });

    if (response.error) {
      setErro(t("Falha ao salvar tag.", "Failed to save tag."));
      setSalvando(false);
      return;
    }

    await carregarTags();
    setDialogAberto(false);
    setTagEditando(null);
    setSalvando(false);
  };

  const handleExcluir = async () => {
    if (!tagExcluir) return;
    setRemovendo(true);
    setErro(null);

    const response = await supabaseClient
      .from("tags")
      .delete()
      .eq("id", tagExcluir.id);

    if (response.error) {
      setErro(t("Falha ao excluir tag.", "Failed to delete tag."));
      setRemovendo(false);
      return;
    }

    setTags((atual) => atual.filter((tag) => tag.id !== tagExcluir.id));
    setDialogExcluir(false);
    setTagExcluir(null);
    setRemovendo(false);
  };

  return (
    <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("Tags", "Tags")}</h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Organize contatos e negócios com etiquetas personalizadas.",
              "Organize contacts and deals with custom tags."
            )}
          </p>
        </div>
        <Button className="gap-2" onClick={abrirNovaTag}>
          <Plus className="h-4 w-4" />
          {t("Nova tag", "New tag")}
        </Button>
      </div>

      {erro && (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder={t("Pesquisar tags", "Search tags")}
              className="w-full sm:max-w-xs"
            />
            <Badge variant="secondary">
              {tagsFiltradas.length} {t("tags", "tags")}
            </Badge>
          </div>

          {carregando ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : tagsFiltradas.length === 0 ? (
            <div className="rounded-[6px] border border-border/60 px-4 py-6 text-sm text-muted-foreground">
              {t("Nenhuma tag encontrada.", "No tags found.")}
            </div>
          ) : (
            <div className="space-y-2">
              {tagsFiltradas.map((tag) => (
                <div
                  key={tag.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-muted/20 px-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-[6px] border border-border/60"
                      style={{ backgroundColor: tag.cor ?? corPadrao }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tag.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {tag.cor ?? corPadrao}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => abrirEditarTag(tag)}
                      aria-label={t("Editar tag", "Edit tag")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => abrirExcluirTag(tag)}
                      aria-label={t("Excluir tag", "Delete tag")}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogAberto}
        onOpenChange={(aberto) => {
          setDialogAberto(aberto);
          if (!aberto) {
            setTagEditando(null);
          }
        }}
      >
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>
              {tagEditando ? t("Editar tag", "Edit tag") : t("Nova tag", "New tag")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Defina um nome e uma cor para organizar seus contatos.",
                "Define a name and a color to organize your contacts."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("Nome da tag", "Tag name")}
              </label>
              <Input
                value={formNome}
                onChange={(event) => setFormNome(event.target.value)}
                placeholder={t("Ex: Lead quente", "e.g. Hot lead")}
              />
            </div>
            <div className="space-y-3">
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => setPaletaExpandida(!paletaExpandida)}
                className="w-full flex items-center justify-between p-3 rounded-[6px] border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-[6px] border border-border/60 flex-shrink-0"
                    style={{ backgroundColor: formCor }}
                  />
                  <div className="text-left">
                    <p className="text-sm font-medium">{t("Cores", "Colors")}</p>
                    <p className="text-xs text-muted-foreground font-mono">{formCor}</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${paletaExpandida ? "rotate-180" : ""
                    }`}
                />
              </button>

              {/* Expandable Palette */}
              {paletaExpandida && (
                <div className="space-y-3 pt-1">
                  {/* Color Palette Grid */}
                  <div className="grid grid-cols-10 gap-1.5">
                    {paletaCores.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        onClick={() => setFormCor(cor)}
                        className={`w-7 h-7 rounded-[6px] border-2 transition-all hover:scale-110 ${formCor.toLowerCase() === cor.toLowerCase()
                            ? "border-slate-900 dark:border-white ring-2 ring-offset-1 ring-slate-400"
                            : "border-transparent hover:border-slate-300"
                          }`}
                        style={{ backgroundColor: cor }}
                        title={cor}
                      />
                    ))}
                  </div>

                  {/* Hex Input */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{t("Hex:", "Hex:")}</span>
                    <Input
                      value={formCor}
                      onChange={(event) => setFormCor(event.target.value)}
                      placeholder="#94a3b8"
                      className="font-mono text-sm flex-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button onClick={handleSalvar} disabled={salvando}>
              {salvando ? t("Salvando...", "Saving...") : t("Salvar", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>{t("Excluir tag", "Delete tag")}</DialogTitle>
            <DialogDescription>
              {t(
                "Esta ação remove a tag e o vínculo com contatos.",
                "This action removes the tag and its links."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogExcluir(false)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={removendo}>
              {removendo ? t("Excluindo...", "Deleting...") : t("Excluir", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
