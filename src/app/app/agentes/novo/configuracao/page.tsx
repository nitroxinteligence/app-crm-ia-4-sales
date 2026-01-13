import { EditorAgente } from "@/components/agentes/editor-agente";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const params = await searchParams;
  const provider = params.provider;
  return <EditorAgente modo="criar" provider={provider} />;
}
