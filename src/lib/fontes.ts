import { Great_Vibes } from "next/font/google";

/**
 * A caligrafia dos nomes no convite.
 *
 * Fica fora do layout de propósito: assim o arquivo só é baixado por quem
 * abre o próprio convite. Se estivesse no layout, as 110 pessoas pagariam a
 * fonte na home, onde ela não aparece em lugar nenhum.
 *
 * É uma quarta família num site que vive bem com três — mas convite de
 * casamento sem caligrafia não parece convite, e nenhuma das três faz isso.
 */
export const script = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--fonte-script",
});
