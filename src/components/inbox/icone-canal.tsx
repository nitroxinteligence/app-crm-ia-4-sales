import { Instagram, Linkedin, Mail, MessagesSquare } from "lucide-react";
import type { CanalId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function IconeCanal({
  canal,
  className,
}: {
  canal: CanalId;
  className?: string;
}) {
  switch (canal) {
    case "whatsapp":
      return <IconeWhatsApp className={cn("text-emerald-500", className)} />;
    case "instagram":
      return <Instagram className={cn("text-pink-500", className)} />;
    case "messenger":
      return <MessagesSquare className={cn("text-sky-500", className)} />;
    case "email":
      return <Mail className={cn("text-amber-500", className)} />;
    case "linkedin":
      return <Linkedin className={cn("text-sky-700", className)} />;
    default:
      return null;
  }
}

function IconeWhatsApp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-4 w-4", className)}
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M19.11 17.48c-.28-.14-1.64-.81-1.89-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.21-.6.07-.28-.14-1.2-.44-2.28-1.4-.84-.75-1.4-1.67-1.57-1.95-.16-.28-.02-.43.12-.57.12-.12.28-.32.42-.48.14-.16.18-.28.28-.46.09-.18.04-.35-.02-.49-.07-.14-.61-1.47-.84-2.02-.22-.53-.44-.46-.61-.46-.16 0-.35-.02-.53-.02-.18 0-.49.07-.75.35-.25.28-.98.96-.98 2.35 0 1.39 1.01 2.74 1.15 2.93.14.18 1.99 3.05 4.82 4.28.67.29 1.19.46 1.59.59.67.21 1.28.18 1.76.11.54-.08 1.64-.67 1.88-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32M16 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.25.6 4.45 1.74 6.38L3.2 28.8l6.58-1.72c1.86 1.02 3.95 1.56 6.22 1.56 7.06 0 12.8-5.74 12.8-12.8S23.06 3.2 16 3.2m0 22.4c-2.05 0-4.06-.56-5.81-1.63l-.42-.25-3.9 1.02 1.04-3.8-.27-.44c-1.1-1.78-1.68-3.83-1.68-5.9 0-6.08 4.95-11.04 11.04-11.04 2.95 0 5.73 1.15 7.82 3.23 2.09 2.09 3.24 4.87 3.24 7.82 0 6.08-4.95 11.04-11.04 11.04"
      />
    </svg>
  );
}
