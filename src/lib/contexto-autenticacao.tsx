"use client";

import * as React from "react";
import type { CanalConectado, EstadoAutenticacao } from "@/lib/types";

const AuthContext = React.createContext<EstadoAutenticacao | null>(null);

const canaisIniciais: CanalConectado[] = [
  { id: "whatsapp", nome: "WhatsApp", conectado: true },
  { id: "instagram", nome: "Instagram", conectado: true },
  { id: "messenger", nome: "Messenger", conectado: false },
  { id: "email", nome: "Email", conectado: true },
  { id: "linkedin", nome: "LinkedIn", conectado: false },
];

const estadoInicial: EstadoAutenticacao = {
  usuario: {
    id: "user-1",
    nome: "Mariana Souza",
    email: "mariana.souza@verticalpartners.com",
    role: "ADMIN",
  },
  workspace: {
    id: "ws-1",
    nome: "Central Vertical Partners",
  },
  canais: canaisIniciais,
  plano: {
    nome: "Premium",
    trialDiasRestantes: 7,
    limites: {
      usuarios: 10,
      canais: 5,
      agentes: 2,
    },
  },
};

export function ProvedorAutenticacao({
  children,
}: {
  children: React.ReactNode;
}) {
  const [estado] = React.useState(estadoInicial);

  const valor = React.useMemo(() => estado, [estado]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAutenticacao() {
  const contexto = React.useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAutenticacao deve ser usado dentro de ProvedorAutenticacao");
  }

  return contexto;
}
