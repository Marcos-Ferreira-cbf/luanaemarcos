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
//
// PADRINHOS são a exceção. Linha começando com * é um convite de padrinhos:
// os dois nomes na mesma linha, separados por +, um link só para o casal.
//
//   * João Pereira + Maria Souza; 62 98888 7777
//   * Tia Nilza                    <- padrinho sozinho também vale
//
// O separador é + e não " e " de propósito: existe gente chamada "Ana e
// Silva", e uma lista que erra o nome de um padrinho é pior do que uma
// lista com um sinal estranho no meio.
//
// O par pode ter UM número por pessoa, e aí o + separa os dois lados também
// do lado do telefone, na mesma ordem dos nomes:
//
//   * João Pereira + Maria Souza; 62 98888 7777 + 62 97777 6666
//
// Isso existe porque o link é do casal mas o WhatsApp não: o mesmo convite
// vai para os dois celulares, e cada um responde o próprio aceite. Com um
// número só, ele fica no convite e nenhuma das duas pessoas tem o seu — o
// painel mostra "sem número" e você acaba mandando na mão.
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
let padrinhos = 0;

for (const bruta of linhas) {
  const ehPadrinho = bruta.startsWith("*");
  const linha = ehPadrinho ? bruta.slice(1).trim() : bruta;

  const [nomesBrutos, telBruto] = linha.split(/[;,]/, 2);
  const nomes = (nomesBrutos ?? "")
    .split("+")
    .map((n) => n.trim())
    .filter(Boolean);

  if (nomes.length === 0) throw new Error(`linha sem nome: "${bruta}"`);
  if (!ehPadrinho && nomes.length > 1) {
    throw new Error(`só convite de padrinhos aceita mais de um nome: "${bruta}"`);
  }

  for (const nome of nomes) {
    const chave = nome.toLowerCase();
    if (vistos.has(chave)) throw new Error(`nome repetido na lista: "${nome}"`);
    vistos.add(chave);
  }

  // Um telefone só vale para a linha inteira; vários seguem a ordem dos
  // nomes. Qualquer outra contagem é engano de digitação, e engano aqui
  // manda o pedido de padrinho para o celular errado.
  const tels = (telBruto ?? "")
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean)
    .map(normalizarTelefone);

  if (tels.length > 1 && tels.length !== nomes.length) {
    throw new Error(
      `${tels.length} telefone(s) para ${nomes.length} nome(s): "${bruta}"`,
    );
  }

  // Do convite fica o primeiro que existir: é o número de recado, usado
  // quando o convidado não tem o próprio.
  const tel = tels[0] ?? null;
  const porPessoa = tels.length > 1 ? tels : nomes.map(() => null);

  // Sem número próprio e sem o do convite, não há como mandar o link.
  semNumero += porPessoa.filter((t) => !t && !tel).length;
  if (ehPadrinho) padrinhos++;

  const codigo = gerarCodigo(usados);
  const tipo = ehPadrinho ? "padrinhos" : "individual";

  // Idempotente pelos nomes: rodar duas vezes não cria a pessoa duas vezes.
  // Sem isso, um "não sei se já rodei" vira 220 convites e dois links por
  // convidado — e ninguém descobre até alguém receber o segundo.
  //
  // A checagem olha todos os nomes da linha: se qualquer um deles já existe,
  // o convite inteiro é pulado. Meio convite de padrinhos — um nome dentro e
  // o outro fora — seria pior do que nenhum.
  saida.push(
    `-- ${nomes.join(" + ")}  ->  /rsvp/${codigo}${ehPadrinho ? "  (padrinhos)" : ""}`,
    "with novos as (",
    "  select * from (values",
    nomes
      .map(
        (n, i) =>
          `    (${aspas(n)}::text, ${porPessoa[i] ? aspas(porPessoa[i]) : "null"}::text)`,
      )
      .join(",\n"),
    "  ) as t(nome, whatsapp)",
    "), c as (",
    "  insert into convites (codigo, whatsapp, tipo)",
    `  select ${aspas(codigo)}, ${tel ? aspas(tel) : "null"}, ${aspas(tipo)}`,
    "   where not exists (",
    "     select 1 from convidados g join novos n on lower(g.nome) = lower(n.nome)",
    "   )",
    "  returning id",
    ")",
    "insert into convidados (convite_id, nome, whatsapp)",
    "select c.id, novos.nome, novos.whatsapp from c, novos;",
    "",
  );
}

saida.push("commit;");
console.log(saida.join("\n"));

console.error(
  `${linhas.length} convite(s) gerado(s)` +
    (padrinhos ? `, ${padrinhos} de padrinhos` : "") +
    (semNumero ? `, ${semNumero} sem número de WhatsApp` : ""),
);
