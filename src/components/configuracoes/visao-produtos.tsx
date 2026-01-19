"use client";

import * as React from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { texto } from "@/lib/idioma";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
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
import { Textarea } from "@/components/ui/textarea";
import { supabaseClient } from "@/lib/supabase/client";
import { ToastAviso } from "@/components/ui/toast-aviso";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Produto = {
  id: string;
  nome: string;
  categoria: string;
  preco: string;
  descricao: string;
};

export function VisaoProdutosConfiguracoes() {
  const { idioma, workspace } = useAutenticacao();
  const workspaceId = workspace?.id;
  const [produtos, setProdutos] = React.useState<Produto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [busca, setBusca] = React.useState("");
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [dialogExcluir, setDialogExcluir] = React.useState(false);
  const [produtoEditando, setProdutoEditando] = React.useState<Produto | null>(null);
  const [produtoExcluir, setProdutoExcluir] = React.useState<Produto | null>(null);
  const [formNome, setFormNome] = React.useState("");
  const [formCategoria, setFormCategoria] = React.useState("");
  const [formPreco, setFormPreco] = React.useState("");
  const [formDescricao, setFormDescricao] = React.useState("");
  const [toastMensagem, setToastMensagem] = React.useState<string | null>(null);

  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );

  const carregarProdutos = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar produtos:", error);
      setToastMensagem(t("Erro ao carregar produtos.", "Error loading products."));
    } else if (data) {
      setProdutos(data);
    }
    setLoading(false);
  }, [workspaceId, t]);

  React.useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  const produtosFiltrados = React.useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((produto) =>
      produto.nome.toLowerCase().includes(termo)
    );
  }, [busca, produtos]);

  const categoriasCount = React.useMemo(() => {
    const categorias = produtos
      .map((produto) => produto.categoria?.trim())
      .filter(Boolean) as string[];
    return new Set(categorias).size;
  }, [produtos]);

  const abrirNovoProduto = () => {
    setProdutoEditando(null);
    setFormNome("");
    setFormCategoria("");
    setFormPreco("");
    setFormDescricao("");
    setDialogAberto(true);
  };

  const abrirEditarProduto = (produto: Produto) => {
    setProdutoEditando(produto);
    setFormNome(produto.nome);
    setFormCategoria(produto.categoria);
    setFormPreco(produto.preco);
    setFormDescricao(produto.descricao);
    setDialogAberto(true);
  };

  const abrirExcluirProduto = (produto: Produto) => {
    setProdutoExcluir(produto);
    setDialogExcluir(true);
  };

  const handleSalvar = async () => {
    if (!formNome.trim() || !workspaceId) {
      return;
    }

    setSaving(true);
    const payload = {
      workspace_id: workspaceId,
      nome: formNome.trim(),
      categoria: formCategoria.trim(),
      preco: formPreco.trim(),
      descricao: formDescricao.trim(),
    };

    try {
      if (produtoEditando) {
        const { error } = await supabaseClient
          .from("products")
          .update(payload)
          .eq("id", produtoEditando.id);

        if (error) throw error;

        setProdutos((atual) =>
          atual.map((item) =>
            item.id === produtoEditando.id ? { ...item, ...payload } : item
          )
        );
      } else {
        const { data, error } = await supabaseClient
          .from("products")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setProdutos((atual) => [data, ...atual]);
        }
      }
      setDialogAberto(false);
      setProdutoEditando(null);
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      setToastMensagem(t("Erro ao salvar produto.", "Error saving product."));
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async () => {
    if (!produtoExcluir) return;

    setDeleting(true);
    try {
      const { error } = await supabaseClient
        .from("products")
        .delete()
        .eq("id", produtoExcluir.id);

      if (error) throw error;

      setProdutos((atual) =>
        atual.filter((produto) => produto.id !== produtoExcluir.id)
      );
      setDialogExcluir(false);
      setProdutoExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      setToastMensagem(t("Erro ao excluir produto.", "Error deleting product."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 [&_*]:rounded-[6px] [&_*]:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("Produtos", "Products")}</h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Cadastre itens e serviços comercializados pelo seu time.",
              "Register items and services offered by your team."
            )}
          </p>
        </div>
        <Button className="gap-2" onClick={abrirNovoProduto}>
          <Plus className="h-4 w-4" />
          {t("Novo produto", "New product")}
        </Button>
      </div>

      <Card className="border-border/60 bg-[#F9F9F9] dark:bg-neutral-900/50">
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-white dark:bg-neutral-950 px-3 py-2 sm:max-w-xs">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder={t("Pesquisar produtos", "Search products")}
                  className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                />
              </div>
              <Badge variant="secondary">
                {produtosFiltrados.length} {t("produtos", "products")}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                {t("Total", "Total")}: {produtos.length}
              </span>
              <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                {t("Categorias", "Categories")}: {categoriasCount}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="grid gap-3 rounded-[6px] border border-border/60 bg-muted/20 px-3 py-3 md:grid-cols-[1.5fr_0.6fr_0.6fr_auto]"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="rounded-[6px] border border-border/60 px-4 py-6 text-sm text-muted-foreground bg-white dark:bg-neutral-950">
              {t("Nenhum produto encontrado.", "No products found.")}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid gap-3 rounded-[6px] border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground md:grid-cols-[1.5fr_0.6fr_0.6fr_auto]">
                <span>{t("Produto", "Product")}</span>
                <span>{t("Categoria", "Category")}</span>
                <span>{t("Preço", "Price")}</span>
                <span className="text-right">{t("Ações", "Actions")}</span>
              </div>
              {produtosFiltrados.map((produto) => (
                <div
                  key={produto.id}
                  className="grid gap-3 rounded-[6px] border border-border/60 bg-white dark:bg-neutral-950 px-3 py-3 md:grid-cols-[1.5fr_0.6fr_0.6fr_auto] md:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">{produto.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {produto.descricao || t("Sem descrição.", "No description.")}
                    </p>
                  </div>
                  <div>
                    {produto.categoria ? (
                      <Badge variant="outline">{produto.categoria}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("Sem categoria", "No category")}
                      </span>
                    )}
                  </div>
                  <div>
                    {produto.preco ? (
                      <Badge variant="secondary">{produto.preco}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("Sem preço", "No price")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => abrirEditarProduto(produto)}
                            aria-label={t("Editar produto", "Edit product")}
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
                            size="icon-sm"
                            onClick={() => abrirExcluirProduto(produto)}
                            aria-label={t("Excluir produto", "Delete product")}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
          if (!saving) {
            setDialogAberto(aberto);
            if (!aberto) {
              setProdutoEditando(null);
            }
          }
        }}
      >
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>
              {produtoEditando
                ? t("Editar produto", "Edit product")
                : t("Novo produto", "New product")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Registre detalhes para facilitar relatórios e propostas.",
                "Register details to streamline reports and proposals."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Nome", "Name")}</label>
              <Input
                value={formNome}
                onChange={(event) => setFormNome(event.target.value)}
                placeholder={t("Ex: Plano Enterprise", "e.g. Enterprise plan")}
                disabled={saving}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("Categoria", "Category")}
                </label>
                <Input
                  value={formCategoria}
                  onChange={(event) => setFormCategoria(event.target.value)}
                  placeholder={t("Plano, Serviço...", "Plan, Service...")}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("Preço", "Price")}</label>
                <Input
                  value={formPreco}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, "");
                    if (!valor) {
                      setFormPreco("");
                      return;
                    }
                    const numero = parseInt(valor, 10) / 100;
                    setFormPreco(
                      numero.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    );
                  }}
                  placeholder="R$ 0,00"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("Descrição", "Description")}
              </label>
              <Textarea
                value={formDescricao}
                onChange={(event) => setFormDescricao(event.target.value)}
                placeholder={t("Detalhes do produto", "Product details")}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)} disabled={saving}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? t("Salvando...", "Saving...") : t("Salvar", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogExcluir} onOpenChange={(open) => !deleting && setDialogExcluir(open)}>
        <DialogContent className="rounded-[6px] shadow-none [&_*]:rounded-[6px] [&_*]:shadow-none">
          <DialogHeader>
            <DialogTitle>{t("Excluir produto", "Delete product")}</DialogTitle>
            <DialogDescription>
              {t(
                "Esta ação remove o produto da lista.",
                "This action removes the product from the list."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogExcluir(false)} disabled={deleting}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={deleting}>
              {deleting ? t("Excluindo...", "Deleting...") : t("Excluir", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastAviso
        mensagem={toastMensagem}
        onClose={() => setToastMensagem(null)}
      />
    </div>
  );
}
