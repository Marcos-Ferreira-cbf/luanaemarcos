/*
 * Aplica db/schema.sql e db/seed.sql no banco apontado por DATABASE_URL.
 *
 * Existe para não depender do psql instalado na máquina — o driver pg já é
 * dependência do projeto. Os dois arquivos são idempotentes (create table
 * if not exists, on conflict do nothing), então rodar de novo não quebra.
 *
 *   node --env-file=.env.local scripts/migrar.mjs
 */
import { readFile } from "node:fs/promises";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida. Use: node --env-file=.env.local scripts/migrar.mjs");
  process.exit(1);
}

const cliente = new Client({
  connectionString: url,
  ssl: url.includes("localhost") ? false : { rejectUnauthorized: true },
  connectionTimeoutMillis: 30_000,
});

const arquivos = process.argv.slice(2);
if (arquivos.length === 0) arquivos.push("db/schema.sql", "db/seed.sql");

try {
  await cliente.connect();
  const { rows } = await cliente.query("select version()");
  console.log(rows[0].version.split(",")[0]);

  for (const caminho of arquivos) {
    const sql = await readFile(caminho, "utf8");
    process.stdout.write(`aplicando ${caminho} ... `);
    await cliente.query(sql);
    console.log("ok");
  }

  const { rows: presentes } = await cliente.query(
    "select grupo, count(*) as n from presentes group by grupo order by grupo",
  );
  console.log("\npresentes por grupo:");
  for (const p of presentes) console.log(`  ${p.grupo.padEnd(12)} ${p.n}`);
} catch (e) {
  console.error("\nfalhou:", e.message);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
