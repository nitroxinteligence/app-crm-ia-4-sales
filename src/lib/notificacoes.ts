export type NotificacaoUI = {
  id: string;
  titulo: string;
  descricao: string;
  tempo: string;
  categoria: string;
  nova: boolean;
};

const CHAVE_NOTIFICACOES = "vpcrm:notifications";
const EVENTO_NOTIFICACOES = "vpcrm:notificacoes";
const LIMITE_NOTIFICACOES = 20;

export function obterNotificacoesLocal(): NotificacaoUI[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = localStorage.getItem(CHAVE_NOTIFICACOES);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados)
      ? dados.filter((item) => item && typeof item.id === "string")
      : [];
  } catch {
    return [];
  }
}

export function adicionarNotificacao(notificacao: NotificacaoUI) {
  if (typeof window === "undefined") return;
  const atuais = obterNotificacoesLocal();
  const proximas = [notificacao, ...atuais].slice(0, LIMITE_NOTIFICACOES);
  localStorage.setItem(CHAVE_NOTIFICACOES, JSON.stringify(proximas));
  window.dispatchEvent(new Event(EVENTO_NOTIFICACOES));
}

export function ouvirNotificacoes(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENTO_NOTIFICACOES, handler);
  return () => window.removeEventListener(EVENTO_NOTIFICACOES, handler);
}
