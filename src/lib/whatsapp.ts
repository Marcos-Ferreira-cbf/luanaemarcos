/**
 * O link que abre a conversa já com o texto dentro.
 *
 * Usa o esquema whatsapp:// em vez de wa.me de propósito. O wa.me passa por
 * api.whatsapp.com — aquela página verde com "Abrir app" e "Continuar para o
 * WhatsApp Web" — e são dois cliques e uma aba de navegador entre a Luana e a
 * conversa. Vezes 110 convidados, é uma tarde inteira de cliques que não
 * precisavam existir. O whatsapp:// entrega o app direto.
 *
 * Isso não é disparo automático, e não tem como ser: enviar sozinho exige a
 * WhatsApp Business Cloud API, com número dedicado e texto aprovado pela Meta
 * antes de sair. Aqui o texto vai pronto e quem aperta enviar é uma pessoa.
 *
 * O texto passa por encodeURIComponent porque as quebras de linha, os acentos
 * e o coração precisam sobreviver à URL — sem isso a mensagem chega picada no
 * primeiro & ou #.
 */
export function linkWhatsapp(numero: string, texto: string): string {
  return `whatsapp://send?phone=${numero}&text=${encodeURIComponent(texto)}`;
}
