import { notFound } from "next/navigation";
import { EditorAgente } from "@/components/agentes/editor-agente";
import { agentesIA } from "@/lib/mock/agentes";

export default function Page({ params }: { params: { id: string } }) {
  const agente = agentesIA.find((item) => item.id === params.id);

  if (!agente) {
    notFound();
  }

  return <EditorAgente modo="editar" agenteInicial={agente} />;
}
