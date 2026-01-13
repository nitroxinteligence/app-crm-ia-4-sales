import { AuthShell } from "@/components/auth/auth-shell";
import { FormAtualizarSenha } from "@/components/auth/form-atualizar-senha";

export default function AtualizarSenhaPage() {
  return (
    <AuthShell
      titulo="Atualizar senha"
      descricao="Defina uma nova senha segura para sua conta."
    >
      <FormAtualizarSenha />
    </AuthShell>
  );
}
