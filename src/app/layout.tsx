import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ProvedorTema } from "@/components/provedores/provedor-tema";
import { ProvedorAutenticacao } from "@/lib/contexto-autenticacao";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "IA Four Sales | CRM com I.A Integrada",
  description: "CRM omnichannel com agentes de IA integrados.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ProvedorTema>
          <ProvedorAutenticacao>{children}</ProvedorAutenticacao>
        </ProvedorTema>
      </body>
    </html>
  );
}
