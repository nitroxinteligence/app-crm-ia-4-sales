import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ProvedorTema } from "@/components/provedores/provedor-tema";
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
  title: "VP CRM",
  description: "CRM omnichannel com agentes de IA da Vertical Partners.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <ProvedorTema>{children}</ProvedorTema>
      </body>
    </html>
  );
}
