import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db, transacao } from "@/lib/db";
import { consultarPagamento } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MINUTOS_ANTES_DE_CONFERIR = 15;

function autorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;

  const enviado = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(enviado);
  const b = Buffer.from(segredo);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Invariante 6: webhook não é fonte única de verdade.
 *
 * Roda a cada 10 minutos pelo GitHub Actions. Faz duas coisas:
 *   1. confere no Mercado Pago todo pendente com mais de 15 minutos
 *   2. expira o que passou do prazo e devolve as cotas para a lista
 *
 * Webhook perdido é normal. Descobrir isso na véspera do casamento, não.
 */
export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const { rows: pendentes } = await db.query<{ id: string; psp_pagamento_id: string }>(
    `select id, psp_pagamento_id
       from pedidos
      where status = 'pendente'
        and psp_pagamento_id is not null
        and criado_em < now() - ($1 || ' minutes')::interval
      limit 100`,
    [String(MINUTOS_ANTES_DE_CONFERIR)],
  );

  let confirmados = 0;
  const falhas: string[] = [];

  for (const p of pendentes) {
    try {
      const pagamento = await consultarPagamento(p.psp_pagamento_id);
      if (pagamento.status !== "approved") continue;

      const ok = await transacao(async (c) => {
        const { rows } = await c.query<{ confirmar_pedido: boolean }>(
          "select confirmar_pedido($1, $2)",
          [p.id, String(pagamento.id)],
        );
        return rows[0].confirmar_pedido;
      });
      if (ok) confirmados++;
    } catch (e) {
      falhas.push(p.id);
      console.error(`conciliação falhou no pedido ${p.id}:`, e);
    }
  }

  // Só depois de conferir: um pedido pago no minuto 29 não pode ser expirado.
  const { rows: exp } = await db.query<{ expirar_pedidos: number }>("select expirar_pedidos()");

  return NextResponse.json({
    conferidos: pendentes.length,
    confirmados,
    expirados: exp[0].expirar_pedidos,
    falhas,
  });
}
