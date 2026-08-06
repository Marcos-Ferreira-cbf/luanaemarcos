import type { Metadata, Viewport } from "next";
import { DM_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

/**
 * As três famílias do protótipo, auto-hospedadas pelo next/font. O CDN do
 * Google renderizaria igual, mas cobra uma conexão a mais antes da primeira
 * pintura — e boa parte dos convidados vai abrir isso no 4G de Barro Alto.
 */
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--fonte-serif",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--fonte-sans",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--fonte-mono",
});

export const metadata: Metadata = {
  title: "Luana & Marcos · 10.10.2026",
  description:
    "Casamento de Luana e Marcos. Sábado, 10 de outubro de 2026, em Barro Alto, Goiás.",
  openGraph: {
    title: "Luana & Marcos · 10.10.2026",
    description: "Diante de Deus, o sim que vale para sempre.",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF8F5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
