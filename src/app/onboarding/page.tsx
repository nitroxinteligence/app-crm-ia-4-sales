"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { LayoutOnboarding } from "@/components/onboarding/layout-onboarding";
import { StepWorkspace } from "@/components/onboarding/step-workspace";
import { StepConnections } from "@/components/onboarding/step-connections";
import { StepTour } from "@/components/onboarding/step-tour";
import { StepTrial } from "@/components/onboarding/step-trial";
import { useAutenticacao } from "@/lib/contexto-autenticacao";

export default function OnboardingPage() {
  const router = useRouter();
  const { session } = useAutenticacao();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [step, setStep] = React.useState(0);

  const [workspace, setWorkspace] = React.useState({
    id: "",
    nome: "",
    segmento: "",
    tamanho_time: "",
  });
  const [nomeUsuario, setNomeUsuario] = React.useState("");
  const [role, setRole] = React.useState<string | null>(null);

  // Carregar dados iniciais
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
        if (!currentSession) {
          router.replace("/entrar");
          return;
        }

        const { data: membership } = await supabaseClient
          .from("workspace_members")
          .select("workspace_id, role")
          .eq("user_id", currentSession.user.id)
          .maybeSingle();

        if (!membership) return;

        setRole(membership.role);

        const [wsRes, profileRes] = await Promise.all([
          supabaseClient
            .from("workspaces")
            .select("id, nome, segmento, tamanho_time")
            .eq("id", membership.workspace_id)
            .single(),
          supabaseClient
            .from("profiles")
            .select("nome")
            .eq("user_id", currentSession.user.id)
            .single(),
        ]);

        if (wsRes.data) {
          setWorkspace({
            id: wsRes.data.id,
            nome: wsRes.data.nome || "",
            segmento: wsRes.data.segmento || "",
            tamanho_time: wsRes.data.tamanho_time || "",
          });
        }

        if (profileRes.data) {
          setNomeUsuario(profileRes.data.nome || "");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleUpdateWorkspace = (data: Partial<typeof workspace> & { nomeUsuario?: string }) => {
    if (data.nomeUsuario !== undefined) {
      setNomeUsuario(data.nomeUsuario);
      delete data.nomeUsuario;
    }
    setWorkspace((prev) => ({ ...prev, ...data }));
  };

  const handleSaveWorkspace = async () => {
    setSaving(true);
    try {
      await Promise.all([
        supabaseClient
          .from("workspaces")
          .update({
            nome: workspace.nome,
            segmento: workspace.segmento,
            tamanho_time: workspace.tamanho_time,
          })
          .eq("id", workspace.id),
        supabaseClient
          .from("profiles")
          .update({ nome: nomeUsuario })
          .eq("user_id", session?.user?.id),
      ]);
      setStep(1);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await supabaseClient
        .from("workspace_settings")
        .update({
          onboarding_concluido: true,
          onboarding_pulado: false,
        })
        .eq("workspace_id", workspace.id);

      router.push("/app/painel");
    } catch (error) {
      console.error("Erro ao finalizar:", error);
      setSaving(false);
    }
  };

  const stepsInfo = [
    { title: "Configure seu Workspace", description: "Vamos personalizar sua experiência no CRM." },
    { title: "Conecte seus Canais", description: "Integre WhatsApp e Instagram para centralizar o atendimento." },
    { title: "Bem-vindo à IA FOUR SALES", description: "Conheça tudo o que nossa plataforma pode fazer por você." },
    { title: "", description: "" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted"></div>
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <LayoutOnboarding
      step={step}
      totalSteps={4}
      title={stepsInfo[step].title}
      description={stepsInfo[step].description}
    >
      {step === 0 && (
        <StepWorkspace
          data={{ ...workspace, nomeUsuario }}
          onUpdate={handleUpdateWorkspace}
          onNext={handleSaveWorkspace}
          loading={saving}
        />
      )}

      {step === 1 && (
        <StepConnections
          workspaceId={workspace.id}
          session={session}
          onNext={() => setStep(2)}
          onPrev={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <StepTour
          onFinish={() => setStep(3)}
          loading={saving}
        />
      )}

      {step === 3 && (
        <StepTrial
          onFinish={handleFinish}
          loading={saving}
        />
      )}
    </LayoutOnboarding>
  );
}
