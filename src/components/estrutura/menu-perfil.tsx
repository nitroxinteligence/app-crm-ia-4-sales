"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useAutenticacao } from "@/lib/contexto-autenticacao";
import { texto } from "@/lib/idioma";
import { supabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

export function MenuPerfil({
  align = "end",
  side = "bottom",
  className,
  mostrarNome = false,
}: {
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  mostrarNome?: boolean;
}) {
  const { usuario, idioma } = useAutenticacao();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const temaEscuro = (theme ?? "dark") === "dark";
  const [montado, setMontado] = React.useState(false);
  React.useEffect(() => {
    setMontado(true);
  }, []);

  const iniciais = usuario.nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSair = async () => {
    await supabaseClient.auth.signOut();
    router.push("/entrar");
  };

  if (!montado) {
    return (
      <Button
        variant="ghost"
        size={mostrarNome ? "default" : "icon"}
        className={cn(
          "h-10",
          mostrarNome ? "w-full justify-start gap-3 px-3" : "w-10",
          className
        )}
        aria-label={texto(idioma, "Abrir menu do usuário", "Open user menu")}
        disabled
      >
        <Avatar className="h-9 w-9">
          {usuario.avatarUrl && (
            <AvatarImage src={usuario.avatarUrl} alt={usuario.nome} />
          )}
          <AvatarFallback>{iniciais}</AvatarFallback>
        </Avatar>
        {mostrarNome && (
          <span className="truncate text-sm font-medium">{usuario.nome}</span>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={mostrarNome ? "default" : "icon"}
          className={cn(
            "h-10",
            mostrarNome ? "w-full justify-start gap-3 px-3" : "w-10",
            className
          )}
          aria-label={texto(idioma, "Abrir menu do usuário", "Open user menu")}
        >
          <Avatar className="h-9 w-9">
            {usuario.avatarUrl && (
              <AvatarImage src={usuario.avatarUrl} alt={usuario.nome} />
            )}
            <AvatarFallback>{iniciais}</AvatarFallback>
          </Avatar>
          {mostrarNome && (
            <span className="truncate text-sm font-medium">{usuario.nome}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-64">
        <DropdownMenuItem asChild>
          <Link href="/app/configuracoes/perfil" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {texto(idioma, "Configurações", "Settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {temaEscuro ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span>{texto(idioma, "Tema escuro", "Dark mode")}</span>
          </div>
          <Switch
            checked={temaEscuro}
            onCheckedChange={(valor) => setTheme(valor ? "dark" : "light")}
          />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive"
          onClick={handleSair}
        >
          <LogOut className="h-4 w-4" />
          {texto(idioma, "Sair", "Sign out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
