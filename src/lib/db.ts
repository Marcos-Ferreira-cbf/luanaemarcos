import { Pool } from "pg";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: true },
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 15_000, // o primeiro acesso após hibernar leva alguns segundos
});

/** Executa um bloco dentro de uma transação, com rollback automático em erro. */
export async function transacao<T>(fn: (c: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const cliente = await db.connect();
  try {
    await cliente.query("begin");
    const r = await fn(cliente);
    await cliente.query("commit");
    return r;
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
}
