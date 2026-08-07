/**
 * Dinheiro sempre em centavos até a hora de mostrar. Float e Real não se
 * dão bem, e um centavo perdido numa cota de gravata vira divergência na
 * conciliação com o Mercado Pago.
 */
export function reais(centavos: number): string {
  const inteiro = Math.round(centavos / 100);
  // Valor quebrado é raro aqui (as cotas são redondas), mas quando aparece
  // vale mostrar os centavos em vez de arredondar escondido.
  if (centavos % 100 !== 0) {
    return (centavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }
  return `R$ ${inteiro.toLocaleString("pt-BR")}`;
}

/**
 * O telefone é guardado em E.164 sem o + — 5562983460910 — porque é o que o
 * wa.me consome direto. Ninguém confere um número nesse formato: para achar
 * o dígito errado a pessoa precisa ver (62) 98346-0910, que é como ela leu
 * no celular. Conferir é justo o que se faz numa tela de edição.
 */
export function telefoneBonito(e164: string | null | undefined): string {
  const d = (e164 ?? "").replace(/\D/g, "");
  if (!d) return "";
  const sem55 = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : d;
  if (sem55.length === 11) return `(${sem55.slice(0, 2)}) ${sem55.slice(2, 7)}-${sem55.slice(7)}`;
  if (sem55.length === 10) return `(${sem55.slice(0, 2)}) ${sem55.slice(2, 6)}-${sem55.slice(6)}`;
  return d;
}
