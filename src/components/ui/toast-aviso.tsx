"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastAviso({
  mensagem,
  onClose,
  variante = "default",
}: {
  mensagem: string | null;
  onClose: () => void;
  variante?: "default" | "erro";
}) {
  React.useEffect(() => {
    if (!mensagem) return;
    const timeout = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timeout);
  }, [mensagem, onClose]);

  if (!mensagem) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed right-6 top-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg",
        variante === "erro"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border/60 bg-background"
      )}
    >
      <span className="flex-1">{mensagem}</span>
      <button
        type="button"
        onClick={onClose}
        className="-mt-0.5 rounded-full p-1 text-current/60 transition hover:text-current"
        aria-label="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
