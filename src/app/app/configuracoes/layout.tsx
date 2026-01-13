import { LayoutConfiguracoes } from "@/components/configuracoes/layout-configuracoes";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LayoutConfiguracoes>{children}</LayoutConfiguracoes>;
}
