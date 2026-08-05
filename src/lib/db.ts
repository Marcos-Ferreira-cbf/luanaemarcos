import { Pool } from "pg";

/**
 * Postgres via connection string — funciona igual no Azure Database for
 * PostgreSQL, num contêiner local ou em qualquer provedor gerenciado.
 * Trocar de provedor é trocar a env.
 *
 * O pool é pequeno de propósito: o Burstable B1ms tem poucas conexões
 * disponíveis, e uma réplica de 0,25 vCPU não atende nada em paralelo que
 * justifique mais. Reconectar é barato; segurar conexão morta não é.
 */
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: true },
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 15_000, // folga para o handshake TLS numa maquina burstable
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
