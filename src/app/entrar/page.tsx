import { AuthShell } from "@/components/auth/auth-shell";
import { FormLogin } from "@/components/auth/form-login";

export default function EntrarPage() {
  return (
    <AuthShell
      titulo="Acesse sua operacao"
      descricao="Entre para acompanhar o inbox, agentes e relatorios em tempo real."
    >
      <FormLogin />
    </AuthShell>
  );
}
