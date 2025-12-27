import { CascaApp } from "@/components/estrutura/casca-app";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CascaApp>{children}</CascaApp>;
}
