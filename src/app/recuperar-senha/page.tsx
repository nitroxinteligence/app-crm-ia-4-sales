import { AuthShell } from "@/components/auth/auth-shell";
import { FormRecuperarSenha } from "@/components/auth/form-recuperar-senha";

export default function RecuperarSenhaPage() {
  return (
    <AuthShell
      titulo="Recuperar senha"
      descricao="Enviaremos um link seguro para redefinir sua senha."
    >
      <FormRecuperarSenha />
    </AuthShell>
  );
}
