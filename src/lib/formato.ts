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
