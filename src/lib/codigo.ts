import { randomInt } from "node:crypto";

// Sem O/0, I/1, S/5: o código vai ser lido em voz alta e digitado errado.
const ALFABETO = "ABCDEFGHJKLMNPQRTUVWXYZ2346789";
const TAMANHO = 6;

/**
 * O mesmo alfabeto e o mesmo tamanho de db/gerar-convites.mjs. A colisão é
 * tratada por quem chama: a coluna é unique, então o banco recusa o
 * repetido e a gente sorteia de novo — mais confiável do que consultar a
 * lista antes e torcer para ninguém inserir no meio.
 */
export function gerarCodigo(): string {
  let c = "";
  for (let i = 0; i < TAMANHO; i++) c += ALFABETO[randomInt(ALFABETO.length)];
  return c;
}

/**
 * Normaliza para E.164 sem o +, que é o que o wa.me consome direto.
 *
 * Celular brasileiro tem 11 dígitos com DDD. Sem DDD não dá para adivinhar:
 * melhor devolver null e o painel dizer "sem número" do que mandar convite
 * para o nono dígito de outra cidade.
 */
export function normalizarTelefone(bruto: string | null | undefined): string | null {
  const d = (bruto ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return null;
}
