import { AuthShell } from "@/components/auth/auth-shell";
import { FormCadastro } from "@/components/auth/form-cadastro";

export default function CadastroPage() {
  return (
    <AuthShell
      titulo="Crie sua conta"
      descricao="Configure o workspace e comece a operar com agentes de IA."
    >
      <FormCadastro />
    </AuthShell>
  );
}
