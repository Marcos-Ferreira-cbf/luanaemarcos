import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luana e Marcos · 10 de outubro de 2026",
  description:
    "Casamento de Luana e Marcos. Sábado, 10 de outubro de 2026, em Barro Alto, Goiás.",
};

export const viewport: Viewport = {
  themeColor: "#FAF8F5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
