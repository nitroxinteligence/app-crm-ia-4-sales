"use client";

import * as React from "react";
import type { CanalId, StatusConversa } from "@/lib/types";
import { conversasInbox } from "@/lib/mock/inbox";
import { ListaConversas } from "@/components/inbox/lista-conversas";
import { ChatConversa } from "@/components/inbox/chat-conversa";
import { PainelContato } from "@/components/inbox/painel-contato";

const LIMITE_INICIAL = 16;

export function VisaoInbox() {
  const [conversas, setConversas] = React.useState(conversasInbox);
  const [statusAtual, setStatusAtual] = React.useState<StatusConversa>("aberta");
  const [busca, setBusca] = React.useState("");
  const [filtroCanal, setFiltroCanal] = React.useState<CanalId | "todos">(
    "todos"
  );
  const [filtroOwner, setFiltroOwner] = React.useState("todos");
  const [somenteNaoLidas, setSomenteNaoLidas] = React.useState(false);
  const [limite, setLimite] = React.useState(LIMITE_INICIAL);
  const [selecionadaId, setSelecionadaId] = React.useState<string | null>(null);
  const [colapsadaConversas, setColapsadaConversas] = React.useState(false);
  const [colapsadaContato, setColapsadaContato] = React.useState(true);

  const conversasFiltradas = React.useMemo(() => {
    return conversas.filter((conversa) => {
      if (conversa.status !== statusAtual) {
        return false;
      }
      if (filtroCanal !== "todos" && conversa.canal !== filtroCanal) {
        return false;
      }
      if (filtroOwner !== "todos" && conversa.owner !== filtroOwner) {
        return false;
      }
      if (somenteNaoLidas && conversa.naoLidas === 0) {
        return false;
      }
      if (!busca) {
        return true;
      }

      const termo = busca.toLowerCase();
      return (
        conversa.contato.nome.toLowerCase().includes(termo) ||
        conversa.ultimaMensagem.toLowerCase().includes(termo)
      );
    });
  }, [busca, conversas, filtroCanal, filtroOwner, somenteNaoLidas, statusAtual]);

  const conversasVisiveis = conversasFiltradas.slice(0, limite);

  React.useEffect(() => {
    setLimite(LIMITE_INICIAL);
  }, [busca, filtroCanal, filtroOwner, somenteNaoLidas, statusAtual]);

  React.useEffect(() => {
    if (!selecionadaId) {
      setSelecionadaId(conversasFiltradas[0]?.id ?? null);
      return;
    }

    const existe = conversasFiltradas.some(
      (conversa) => conversa.id === selecionadaId
    );
    if (!existe) {
      setSelecionadaId(conversasFiltradas[0]?.id ?? null);
    }
  }, [conversasFiltradas, selecionadaId]);

  const conversaSelecionada = React.useMemo(() => {
    return (
      conversasFiltradas.find((conversa) => conversa.id === selecionadaId) ??
      conversasFiltradas[0] ??
      null
    );
  }, [conversasFiltradas, selecionadaId]);

  const owners = React.useMemo(() => {
    const todos = new Set(conversas.map((conversa) => conversa.owner));
    return ["todos", ...Array.from(todos)];
  }, [conversas]);

  const handleCarregarMais = React.useCallback(() => {
    setLimite((atual) => Math.min(atual + 12, conversasFiltradas.length));
  }, [conversasFiltradas.length]);

  const handleMarcarNaoLido = React.useCallback((id: string) => {
    setConversas((atual) =>
      atual.map((conversa) =>
        conversa.id === id
          ? { ...conversa, naoLidas: Math.max(conversa.naoLidas, 1) }
          : conversa
      )
    );
  }, []);

  const estiloColunas = React.useMemo(
    () =>
      ({
        "--col-esq": colapsadaConversas ? "56px" : "320px",
        "--col-dir": colapsadaContato ? "0px" : "320px",
      }) as React.CSSProperties,
    [colapsadaContato, colapsadaConversas]
  );

  return (
    <div
      className="grid gap-4 lg:grid-cols-[var(--col-esq)_minmax(0,1fr)_var(--col-dir)] transition-[grid-template-columns] duration-300 ease-out"
      style={estiloColunas}
    >
      <ListaConversas
        conversas={conversasVisiveis}
        selecionadaId={conversaSelecionada?.id ?? null}
        aoSelecionar={setSelecionadaId}
        aoMarcarNaoLido={handleMarcarNaoLido}
        statusAtual={statusAtual}
        aoAlterarStatus={setStatusAtual}
        busca={busca}
        aoAlterarBusca={setBusca}
        filtroCanal={filtroCanal}
        aoAlterarFiltroCanal={setFiltroCanal}
        filtroOwner={filtroOwner}
        aoAlterarFiltroOwner={setFiltroOwner}
        owners={owners}
        somenteNaoLidas={somenteNaoLidas}
        aoAlterarSomenteNaoLidas={setSomenteNaoLidas}
        aoCarregarMais={handleCarregarMais}
        temMais={conversasFiltradas.length > conversasVisiveis.length}
        colapsada={colapsadaConversas}
        aoAlternarColapso={() => setColapsadaConversas((valor) => !valor)}
      />

      <ChatConversa
        conversa={conversaSelecionada}
        aoAbrirContato={() => setColapsadaContato(false)}
      />

      <PainelContato
        conversa={conversaSelecionada}
        colapsada={colapsadaContato}
        aoAlternarColapso={() => setColapsadaContato((valor) => !valor)}
      />
    </div>
  );
}
