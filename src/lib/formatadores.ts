export function formatarMoeda(valor: number, moeda: "BRL" | "USD"): string {
  const locale = moeda === "BRL" ? "pt-BR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: moeda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatarNumero(valor: number): string {
  const locale =
    typeof document !== "undefined" && document.documentElement.lang
      ? document.documentElement.lang
      : "pt-BR";
  return new Intl.NumberFormat(locale).format(valor);
}
