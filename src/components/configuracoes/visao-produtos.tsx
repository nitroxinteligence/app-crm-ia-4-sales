"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

type Produto = {
  id: string;
  nome: string;
  categoria: string;
  preco: string;
  descricao: string;
};

const gerarId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1000)}`;

export function VisaoProdutosConfiguracoes() {
  const { idioma } = useAutenticacao();
  const [produtos, setProdutos] = React.useState<Produto[]>(() => [
    {
      id: gerarId(),
      nome: "Assinatura Premium",
      categoria: "Plano",
      preco: "R$ 299,00",
      descricao: "Acesso completo ao workspace com automações.",
    },
    {
      id: gerarId(),
      nome: "Onboarding Assistido",
      categoria: "Serviço",
      preco: "R$ 1.500,00",
      descricao: "Setup guiado para times e playbooks.",
    },
  ]);
  const [busca, setBusca] = React.useState("");
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [dialogExcluir, setDialogExcluir] = React.useState(false);
  const [produtoEditando, setProdutoEditando] = React.useState<Produto | null>(null);
  const [produtoExcluir, setProdutoExcluir] = React.useState<Produto | null>(null);
  const [formNome, setFormNome] = React.useState("");
  const [formCategoria, setFormCategoria] = React.useState("");
  const [formPreco, setFormPreco] = React.useState("");
  const [formDescricao, setFormDescricao] = React.useState("");

  const t = React.useCallback(
    (pt: string, en: string) => texto(idioma, pt, en),
    [idioma]
  );

  const produtosFiltrados = React.useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((produto) =>
      produto.nome.toLowerCase().includes(termo)
    );
  }, [busca, produtos]);

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

  const handleSalvar = () => {
    if (!formNome.trim()) {
      return;
    }

    if (produtoEditando) {
      setProdutos((atual) =>
        atual.map((item) =>
          item.id === produtoEditando.id
            ? {
                ...item,
                nome: formNome.trim(),
                categoria: formCategoria.trim(),
                preco: formPreco.trim(),
                descricao: formDescricao.trim(),
              }
            : item
        )
      );
    } else {
      setProdutos((atual) => [
        {
          id: gerarId(),
          nome: formNome.trim(),
          categoria: formCategoria.trim(),
          preco: formPreco.trim(),
          descricao: formDescricao.trim(),
        },
        ...atual,
      ]);
    }

    setDialogAberto(false);
    setProdutoEditando(null);
  };

  const handleExcluir = () => {
    if (!produtoExcluir) return;
    setProdutos((atual) =>
      atual.filter((produto) => produto.id !== produtoExcluir.id)
    );
    setDialogExcluir(false);
    setProdutoExcluir(null);
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

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder={t("Pesquisar produtos", "Search products")}
              className="w-full sm:max-w-xs"
            />
            <Badge variant="secondary">
              {produtosFiltrados.length} {t("produtos", "products")}
            </Badge>
          </div>

          {produtosFiltrados.length === 0 ? (
            <div className="rounded-[6px] border border-border/60 px-4 py-6 text-sm text-muted-foreground">
              {t("Nenhum produto encontrado.", "No products found.")}
            </div>
          ) : (
            <div className="space-y-2">
              {produtosFiltrados.map((produto) => (
                <div
                  key={produto.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border/60 bg-muted/20 px-3 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">{produto.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {produto.descricao || t("Sem descrição.", "No description.")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {produto.categoria && (
                        <Badge variant="outline">{produto.categoria}</Badge>
                      )}
                      {produto.preco && (
                        <Badge variant="secondary">{produto.preco}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => abrirEditarProduto(produto)}
                      aria-label={t("Editar produto", "Edit product")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => abrirExcluirProduto(produto)}
                      aria-label={t("Excluir produto", "Delete product")}
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
            setProdutoEditando(null);
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
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("Preço", "Price")}</label>
                <Input
                  value={formPreco}
                  onChange={(event) => setFormPreco(event.target.value)}
                  placeholder="R$ 0,00"
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button onClick={handleSalvar}>{t("Salvar", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
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
            <Button variant="outline" onClick={() => setDialogExcluir(false)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleExcluir}>
              {t("Excluir", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
