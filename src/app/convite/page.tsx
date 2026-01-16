import * as React from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormConvite } from "@/components/auth/form-convite";

export default function ConvitePage() {
  return (
    <AuthShell
      titulo="Aceitar convite"
      descricao="Crie sua conta para entrar no workspace."
    >
      <React.Suspense fallback={null}>
        <FormConvite />
      </React.Suspense>
    </AuthShell>
  );
}
