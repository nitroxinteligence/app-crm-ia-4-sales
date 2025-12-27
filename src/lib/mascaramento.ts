export function mascararTelefone(telefone: string): string {
  const apenasNumeros = telefone.replace(/\D/g, "");
  if (apenasNumeros.length < 4) {
    return "(**)*****-****";
  }

  const final = apenasNumeros.slice(-4);
  return `(**)*****-${final}`;
}

export function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) {
    return "m***@dominio.com";
  }

  return `${usuario[0]}***@${dominio}`;
}
