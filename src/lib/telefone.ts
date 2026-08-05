/**
 * Telefone brasileiro para o formato que o WhatsApp entende (E.164 sem o +).
 *
 * O convidado digita como quiser — (62) 99632-5652, 62996325652, com o 55 na
 * frente, com traço, sem traço. O que sai daqui é sempre 55DDNNNNNNNNN, ou
 * null quando não dá para confiar no que veio.
 *
 * Guardar formatado seria pedir para descobrir, na hora de mandar o
 * agradecimento, que metade dos números não disca.
 */
export function normalizarWhatsapp(bruto: string): string | null {
  let d = bruto.replace(/\D/g, "");

  // Alguns colam com o código do país já embutido.
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length < 10 || d.length > 11) return null;

  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;

  const numero = d.slice(2);

  // Celular no Brasil tem 9 dígitos e começa com 9. Fixo de 8 dígitos existe,
  // mas não recebe WhatsApp — recusar aqui é melhor do que descobrir depois.
  if (numero.length === 8) return null;
  if (numero.length === 9 && !numero.startsWith("9")) return null;

  return `55${d}`;
}

/** (62) 99632-5652 — só para mostrar enquanto a pessoa digita. */
export function mascararWhatsapp(bruto: string): string {
  const d = bruto.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
