export type MotivoPerdaItem = {
  id: string;
  titulo: string;
  obrigatorio: boolean;
  criadoEm: string;
};

const STORAGE_KEY = "vpcrm_loss_reasons";

export const motivosPerdaPadrao: MotivoPerdaItem[] = [
  {
    id: "outro",
    titulo: "Outro",
    obrigatorio: true,
    criadoEm: new Date().toISOString(),
  },
  {
    id: "requisitos-mudaram",
    titulo: "Requisitos mudaram",
    obrigatorio: true,
    criadoEm: new Date().toISOString(),
  },
  {
    id: "momento-inadequado",
    titulo: "Momento inadequado",
    obrigatorio: false,
    criadoEm: new Date().toISOString(),
  },
  {
    id: "sem-interesse",
    titulo: "Sem interesse",
    obrigatorio: false,
    criadoEm: new Date().toISOString(),
  },
  {
    id: "projeto-cancelado",
    titulo: "Projeto cancelado",
    obrigatorio: false,
    criadoEm: new Date().toISOString(),
  },
  {
    id: "concorrente-escolhido",
    titulo: "Concorrente escolhido",
    obrigatorio: true,
    criadoEm: new Date().toISOString(),
  },
  {
    id: "limitacoes-orcamento",
    titulo: "Limitações de orçamento",
    obrigatorio: false,
    criadoEm: new Date().toISOString(),
  },
];

export const lerMotivosPerda = (): MotivoPerdaItem[] => {
  if (typeof window === "undefined") return motivosPerdaPadrao;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return motivosPerdaPadrao;
    const parsed = JSON.parse(raw) as MotivoPerdaItem[];
    return parsed?.length ? parsed : motivosPerdaPadrao;
  } catch {
    return motivosPerdaPadrao;
  }
};

export const salvarMotivosPerda = (items: MotivoPerdaItem[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};
