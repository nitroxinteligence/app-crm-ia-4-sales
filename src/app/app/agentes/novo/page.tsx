import { redirect } from "next/navigation";

// Página temporariamente desabilitada - redirecionar para painel
export default function Page() {
  redirect("/app/painel");
}
