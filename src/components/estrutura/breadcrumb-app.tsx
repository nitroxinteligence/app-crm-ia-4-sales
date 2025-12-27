"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { rotulosRotas } from "@/lib/navegacao";

export function BreadcrumbApp() {
  const pathname = usePathname();

  const partes = React.useMemo(() => {
    return pathname
      .split("/")
      .filter(Boolean)
      .filter((parte) => parte !== "app");
  }, [pathname]);

  if (partes.length === 0) {
    return null;
  }

  const itens = partes.map((parte, index) => {
    const href = `/app/${partes.slice(0, index + 1).join("/")}`;
    const titulo = rotulosRotas[parte] ?? parte;
    const ultimo = index === partes.length - 1;

    return {
      href,
      titulo,
      ultimo,
    };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {itens.map((item, index) => (
          <React.Fragment key={item.href}>
            <BreadcrumbItem>
              {item.ultimo ? (
                <BreadcrumbPage>{item.titulo}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.titulo}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < itens.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
