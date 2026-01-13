export const planosConfig = {
  Essential: {
    usuarios: 2,
    canais: 2,
    agentes: 0,
  },
  Pro: {
    usuarios: 15,
    canais: 10,
    agentes: 3,
  },
  Premium: {
    usuarios: 25,
    canais: 999,
    agentes: 999,
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
