export interface Deal {
    id: string;
    title: string;
    company: string;
    value: number;
    currency: string;
    status: "open" | "won" | "lost";
    stage: "Qualificação" | "Proposta" | "Negociação" | "Fechamento";
    owner: {
        name: string;
        avatar?: string;
    };
    contact: {
        name: string;
        email: string;
        phone: string;
        role: string;
    };
    tags: { id: string; name: string; color: string }[];
    lastActivity: string;
    nextActivity?: {
        type: "meeting" | "call" | "email";
        date: string;
        title: string;
    };
    history: {
        id: string;
        type: "note" | "call" | "email" | "status" | "stage";
        content: string;
        date: string;
        author: string;
    }[];
}

export const mockDeal: Deal = {
    id: "DEA-2024-001",
    title: "Licença Enterprise - Q1",
    company: "TechSolutions Inc.",
    value: 125000,
    currency: "BRL",
    status: "open",
    stage: "Negociação",
    owner: {
        name: "Mateus M",
        avatar: "https://github.com/shadcn.png",
    },
    contact: {
        name: "Roberto Silva",
        email: "roberto@techsolutions.com",
        phone: "(11) 98765-4321",
        role: "CTO",
    },
    tags: [
        { id: "1", name: "Quente", color: "#ef4444" },
        { id: "2", name: "Enterprise", color: "#3b82f6" },
        { id: "3", name: "Q1", color: "#10b981" },
    ],
    lastActivity: "2024-03-15T14:30:00Z",
    nextActivity: {
        type: "meeting",
        date: "2024-03-20T10:00:00Z",
        title: "Revisão de Contrato",
    },
    history: [
        {
            id: "1",
            type: "note",
            content: "Cliente pediu desconto de 5% para fechar ainda este mês.",
            date: "2024-03-15T14:30:00Z",
            author: "Mateus M",
        },
        {
            id: "2",
            type: "call",
            content: "Call de demonstração realizada com sucesso. Gostaram muito da feature de IA.",
            date: "2024-03-10T11:00:00Z",
            author: "Mateus M",
        },
        {
            id: "3",
            type: "stage",
            content: "Mudou de 'Proposta' para 'Negociação'",
            date: "2024-03-12T09:15:00Z",
            author: "Sistema",
        },
    ],
};
