import * as React from "react";
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
      return <IconeWhatsApp className={cn("text-[#25D366]", className)} />;
    case "instagram":
      return <IconeInstagram className={className} />;
    default:
      return null;
  }
}

function IconeWhatsApp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      aria-hidden
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9.2 8.6c.9 2.2 2.6 3.9 4.8 4.8l1.2-1.2c.2-.2.5-.27.8-.17l1.7.68c.3.12.5.44.43.76l-.36 1.7c-.07.33-.37.57-.71.57-4.9 0-8.87-3.97-8.87-8.87 0-.34.24-.64.57-.71l1.7-.36c.32-.07.64.12.76.43l.68 1.7c.1.26.04.56-.17.78l-1.2 1.21Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeInstagram({ className }: { className?: string }) {
  const gradientId = React.useId();
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="35%" stopColor="#DD2A7B" />
          <stop offset="70%" stopColor="#8134AF" />
          <stop offset="100%" stopColor="#515BD4" />
        </linearGradient>
      </defs>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4.5"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        r="3.6"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.6"
      />
      <circle cx="16.6" cy="7.4" r="1" fill={`url(#${gradientId})`} />
    </svg>
  );
}
