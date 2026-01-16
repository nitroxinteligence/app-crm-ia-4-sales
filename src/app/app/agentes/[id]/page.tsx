import { redirect } from "next/navigation";

// Página temporariamente desabilitada - redirecionar para painel
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  redirect("/app/painel");
}
