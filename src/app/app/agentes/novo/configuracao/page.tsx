import { redirect } from "next/navigation";

// Página temporariamente desabilitada - redirecionar para painel
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  redirect("/app/painel");
}
