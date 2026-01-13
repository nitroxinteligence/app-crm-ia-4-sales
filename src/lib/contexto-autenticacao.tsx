"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  CanalConectado,
  CanalId,
  EstadoAutenticacao,
  IdiomaApp,
  Role,
} from "@/lib/types";
import { normalizarPlano, planosConfig } from "@/lib/planos";
import { supabaseClient } from "@/lib/supabase/client";

type AuthContextValue = EstadoAutenticacao & {
  recarregar: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const canaisPadrao: CanalConectado[] = [
  { id: "whatsapp", nome: "WhatsApp", conectado: false },
  { id: "instagram", nome: "Instagram", conectado: false },
];

// plan config shared in src/lib/planos

const estadoVazio = (sessao: Session | null): EstadoAutenticacao => ({
  usuario: {
    id: sessao?.user.id ?? "",
    nome: sessao?.user.email ?? "",
    email: sessao?.user.email ?? "",
    role: "VIEWER",
  },
  workspace: {
    id: "",
    nome: "",
    planoPeriodo: null,
    planoSelecionadoEm: null,
    trialStartedAt: null,
    trialEndsAt: null,
  },
  canais: canaisPadrao,
  plano: {
    nome: "Essential",
    trialDiasRestantes: 0,
    limites: {
      usuarios: 0,
      canais: 0,
      agentes: 0,
    },
  },
  idioma: "pt-BR",
});

export function ProvedorAutenticacao({
  children,
}: {
  children: React.ReactNode;
}) {
  const [estado, setEstado] = React.useState<EstadoAutenticacao>(
    estadoVazio(null)
  );
  const [session, setSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const carregarEstado = React.useCallback(
    async (sessao: Session | null) => {
      if (!sessao) {
        setEstado(estadoVazio(null));
        return;
      }

      const { data: membership } = await supabaseClient
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", sessao.user.id)
        .maybeSingle();

      if (!membership?.workspace_id) {
        setEstado(estadoVazio(sessao));
        return;
      }

      const { data: workspace } = await supabaseClient
        .from("workspaces")
        .select(
          "id, nome, plano, plano_periodo, plano_selected_at, trial_started_at, trial_ends_at"
        )
        .eq("id", membership.workspace_id)
        .maybeSingle();

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("nome, email, avatar_url, idioma")
        .eq("user_id", sessao.user.id)
        .maybeSingle();

      const { data: integracoes } = await supabaseClient
        .from("integrations")
        .select("canal, status")
        .eq("workspace_id", membership.workspace_id);

      const canais: CanalConectado[] = (
        ["whatsapp", "instagram"] as CanalId[]
      ).map((canal) => ({
        id: canal,
        nome:
          canal === "whatsapp"
            ? "WhatsApp"
            : "Instagram",
        conectado:
          integracoes?.some(
            (item) => item.canal === canal && item.status === "conectado"
          ) ?? false,
      }));

      const role = (membership.role ?? "MEMBER") as Role;
      const planoWorkspace = normalizarPlano(workspace?.plano);
      const planoEfetivo: keyof typeof planosConfig =
        role === "ADMIN" ? "Premium" : planoWorkspace;

      setEstado({
        usuario: {
          id: sessao.user.id,
          nome: profile?.nome ?? sessao.user.email ?? "",
          email: profile?.email ?? sessao.user.email ?? "",
          avatarUrl: profile?.avatar_url ?? undefined,
          role,
        },
        workspace: {
          id: workspace?.id ?? membership.workspace_id,
          nome: workspace?.nome ?? "",
          plano: planoEfetivo,
          planoPeriodo: workspace?.plano_periodo ?? null,
          planoSelecionadoEm: workspace?.plano_selected_at ?? null,
          trialStartedAt: workspace?.trial_started_at ?? null,
          trialEndsAt: workspace?.trial_ends_at ?? null,
        },
        canais,
        plano: {
          nome: planoEfetivo,
          trialDiasRestantes: workspace?.trial_ends_at
            ? Math.max(
                0,
                Math.ceil(
                  (Date.parse(workspace.trial_ends_at) - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0,
          limites: planosConfig[planoEfetivo],
        },
        idioma: (profile?.idioma ?? "pt-BR") as IdiomaApp,
      });
    },
    []
  );

  React.useEffect(() => {
    void carregarEstado(session);
  }, [carregarEstado, session]);

  const recarregar = React.useCallback(async () => {
    await carregarEstado(session);
  }, [carregarEstado, session]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = estado.idioma;
  }, [estado.idioma]);

  const valor = React.useMemo(
    () => ({
      ...estado,
      recarregar,
    }),
    [estado, recarregar]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAutenticacao() {
  const contexto = React.useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAutenticacao deve ser usado dentro de ProvedorAutenticacao");
  }

  return contexto;
}
