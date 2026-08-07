/**
 * "Erick e Magda" — a lista de nomes como se fala, não como se armazena.
 *
 * Com um nome só o "e" nunca aparece, e com três em diante a vírgula segura
 * os primeiros: "Erick, Magda e Ana". O convite de padrinhos é feito ao casal
 * junto, então a peça traz os dois numa linha — separar em duas linhas faria
 * parecer dois convites que por acaso chegaram no mesmo envelope.
 */
export function juntarNomes(nomes: string[]): string {
  const limpos = nomes.map((n) => n.trim()).filter(Boolean);
  if (limpos.length === 0) return "";
  if (limpos.length === 1) return limpos[0];
  return `${limpos.slice(0, -1).join(", ")} e ${limpos.at(-1)}`;
}
