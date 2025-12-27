"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

export function MenuPerfil() {
  const { usuario } = useAutenticacao();
  const { theme, setTheme } = useTheme();
  const temaEscuro = (theme ?? "dark") === "dark";

  const iniciais = usuario.nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{iniciais}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left text-xs md:block">
            <p className="font-medium leading-tight">{usuario.nome}</p>
            <p className="text-muted-foreground">{usuario.role}</p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Conta</DropdownMenuLabel>
        <DropdownMenuItem>Perfil</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {temaEscuro ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span>Tema escuro</span>
          </div>
          <Switch
            checked={temaEscuro}
            onCheckedChange={(valor) => setTheme(valor ? "dark" : "light")}
          />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
