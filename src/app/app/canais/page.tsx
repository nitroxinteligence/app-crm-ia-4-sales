import { Card, CardContent } from "@/components/ui/card";

export default function Page() {
  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-lg font-semibold">Conectar canais</p>
        <p className="text-sm text-muted-foreground">
          Área em construção para configuração de canais.
        </p>
      </CardContent>
    </Card>
  );
}
