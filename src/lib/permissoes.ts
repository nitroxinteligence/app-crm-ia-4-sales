import type { Role } from "@/lib/types";

export function podeAcessarModulo(role: Role, modulo: "painel"): boolean {
  if (modulo === "painel") {
    return true;
  }

  return false;
}

export function podeVerDadosSensiveis(role: Role): boolean {
  return role !== "VIEWER";
}
