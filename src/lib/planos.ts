export const planosConfig = {
  Essential: {
    usuarios: 2,
    canais: 2,
    agentes: 0,
    contatos: 10000,
    pipelines: 5,
    etapas: 10,
  },
  Pro: {
    usuarios: 10,
    canais: 10,
    agentes: 3,
    contatos: 100000,
    pipelines: 20,
    etapas: 15,
  },
  Premium: {
    usuarios: 20,
    canais: 999,
    agentes: 999,
    contatos: 999999,
    pipelines: 999,
    etapas: 25,
  },
};

export type PlanoNome = keyof typeof planosConfig;

export const normalizarPlano = (plano?: string | null): PlanoNome => {
  if (plano === "Basic") return "Essential";
  if (plano === "Essential" || plano === "Pro" || plano === "Premium") {
    return plano;
  }
  return "Essential";
};

type PlanoWorkspaceInfo = {
  plano?: string | null;
  trial_plano?: string | null;
  plano_selected_at?: string | null;
  trial_ends_at?: string | null;
};

export const resolverPlanoEfetivo = (
  workspace?: PlanoWorkspaceInfo | null
): PlanoNome => {
  if (!workspace) return "Essential";
  const agora = Date.now();
  const trialEnds = workspace.trial_ends_at
    ? Date.parse(workspace.trial_ends_at)
    : null;
  const trialAtivo = trialEnds !== null && !Number.isNaN(trialEnds) && trialEnds >= agora;
  if (!workspace.plano_selected_at && trialAtivo) {
    return normalizarPlano(workspace.trial_plano ?? "Pro");
  }
  return normalizarPlano(workspace.plano);
};

export type PlanoPeriodo = "mensal" | "semestral" | "anual";

export const planosPrecos = {
  Essential: {
    mensal: { valor: 97, label: "R$ 97,00/mês", labelMensal: "R$ 97,00/mês" },
    semestral: { valor: 523.80, label: "R$ 523,80 à vista", labelMensal: "R$ 87,30/mês" },
    anual: { valor: 931.20, label: "R$ 931,20 à vista", labelMensal: "R$ 77,60/mês" },
  },
  Pro: {
    mensal: { valor: 597, label: "R$ 597,00/mês", labelMensal: "R$ 597,00/mês" },
    semestral: { valor: 3223.80, label: "R$ 3.223,80 à vista", labelMensal: "R$ 537,30/mês" },
    anual: { valor: 5731.20, label: "R$ 5.731,20 à vista", labelMensal: "R$ 477,60/mês" },
  },
  Premium: {
    mensal: { valor: 897, label: "R$ 897,00/mês", labelMensal: "R$ 897,00/mês" },
    semestral: { valor: 4843.80, label: "R$ 4.843,80 à vista", labelMensal: "R$ 807,30/mês" },
    anual: { valor: 8611.20, label: "R$ 8.611,20 à vista", labelMensal: "R$ 717,60/mês" },
  },
};

export const obterDetalhesPlano = (
  plano: PlanoNome,
  periodo: PlanoPeriodo = "mensal"
) => {
  const precos = planosPrecos[plano];
  return precos[periodo];
};

