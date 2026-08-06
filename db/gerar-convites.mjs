// =====================================================================
// Gera o SQL dos convites a partir de uma lista local.
//
//   node db/gerar-convites.mjs db/lista.csv > db/convites.sql
//   psql "$DATABASE_URL" -f db/convites.sql
//
// A lista e o SQL gerado são ignorados pelo git de propósito: o repositório
// é público, e nome com telefone de 110 pessoas não entra em repositório
// público. Os dois arquivos vivem só na sua máquina e no banco.
//
// Formato da lista — uma pessoa por linha, nome e telefone separados por
// vírgula ou ponto e vírgula. Linha começando com # é comentário:
//
//   Maria Souza, (62) 99632-5652
//   João Pereira; 62 98888 7777
//   Tia Nilza                      <- sem número, convite entregue na mão
//
// O convite é individual. Um casal são duas linhas e dois links.
// =====================================================================

import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";

// Sem O/0, I/1, S/5: o código vai ser lido em voz alta e digitado errado.
const ALFABETO = "ABCDEFGHJKLMNPQRTUVWXYZ2346789";
const TAMANHO = 6;

function gerarCodigo(usados) {
  for (;;) {
    let c = "";
    for (let i = 0; i < TAMANHO; i++) c += ALFABETO[randomInt(ALFABETO.length)];
    if (!usados.has(c)) {
      usados.add(c);
      return c;
    }
  }
}

/**
 * Normaliza para E.164 sem o +, que é o que o wa.me consome direto.
 *
 * Celular brasileiro tem 11 dígitos com DDD. Sem DDD não dá para adivinhar:
 * melhor devolver null e o painel dizer "sem número" do que mandar convite
 * para o nono dígito de outra cidade.
 */
function normalizarTelefone(bruto) {
  const d = (bruto ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  throw new Error(`telefone não reconhecido: "${bruto}"`);
}

const aspas = (s) => `'${String(s).replace(/'/g, "''")}'`;

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("uso: node db/gerar-convites.mjs <lista.csv>");
  process.exit(1);
}

const linhas = readFileSync(arquivo, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

const usados = new Set();
const vistos = new Set();
const saida = [
  "-- Gerado por db/gerar-convites.mjs. Não versionar.",
  `-- ${linhas.length} convite(s), um por pessoa.`,
  "",
  "begin;",
  "",
];

let semNumero = 0;

for (const linha of linhas) {
  const [nomeBruto, telBruto] = linha.split(/[;,]/, 2);
  const nome = (nomeBruto ?? "").trim();
  if (!nome) throw new Error(`linha sem nome: "${linha}"`);

  const chave = nome.toLowerCase();
  if (vistos.has(chave)) throw new Error(`nome repetido na lista: "${nome}"`);
  vistos.add(chave);

  const tel = normalizarTelefone(telBruto);
  if (!tel) semNumero++;

  const codigo = gerarCodigo(usados);

  // Idempotente pelo nome: rodar duas vezes não cria a pessoa duas vezes.
  // Sem isso, um "não sei se já rodei" vira 220 convites e dois links por
  // convidado — e ninguém descobre até alguém receber o segundo.
  saida.push(
    `-- ${nome}  ->  /rsvp/${codigo}`,
    "with novo as (",
    `  select ${aspas(nome)}::text as nome, ${tel ? aspas(tel) : "null"}::text as zap`,
    "), c as (",
    "  insert into convites (codigo, whatsapp)",
    `  select ${aspas(codigo)}, novo.zap from novo`,
    "   where not exists (select 1 from convidados where lower(nome) = lower(novo.nome))",
    "  returning id",
    ")",
    "insert into convidados (convite_id, nome) select c.id, novo.nome from c, novo;",
    "",
  );
}

saida.push("commit;");
console.log(saida.join("\n"));

console.error(
  `${linhas.length} convite(s) gerado(s)` +
    (semNumero ? `, ${semNumero} sem número de WhatsApp` : ""),
);
