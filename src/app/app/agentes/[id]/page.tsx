import { EditorAgente } from "@/components/agentes/editor-agente";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorAgente modo="editar" agenteId={id} layout="wizard" />;
}
