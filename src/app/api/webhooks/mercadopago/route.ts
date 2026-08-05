import { NextResponse } from "next/server";
import { db, transacao } from "@/lib/db";
import { assinaturaValida, consultarPagamento } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Mercado Pago.
 *
 * Sempre devolve 200 depois de validar a assinatura, mesmo quando não há nada
 * a fazer: erro 4xx/5xx faz o Mercado Pago reenviar por horas. O que não deu
 * certo é responsabilidade do cron de conciliação (invariante 6).
 */
export async function POST(req: Request) {
  const bruto = await req.text();

  let corpo: { type?: string; action?: string; data?: { id?: string } };
  try {
    corpo = JSON.parse(bruto);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const dataId = corpo.data?.id ? String(corpo.data.id) : null;

  const ok = assinaturaValida({
    xSignature: req.headers.get("x-signature"),
    xRequestId: req.headers.get("x-request-id"),
    dataId,
  });
  if (!ok) {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  if (corpo.type !== "payment" || !dataId) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  // Invariante 4: idempotência pela constraint unique (psp, evento_id).
  // Se este evento já passou por aqui, o insert não afeta nenhuma linha.
  const { rowCount } = await db.query(
    `insert into webhook_eventos (psp, evento_id, tipo, payload)
     values ('mercadopago', $1, $2, $3::jsonb)
     on conflict (psp, evento_id) do nothing`,
    [dataId, corpo.action ?? corpo.type, bruto],
  );
  if (rowCount === 0) {
    return NextResponse.json({ ok: true, repetido: true });
  }

  try {
    // Invariante 5: o status vem da consulta, nunca do corpo da notificação.
    const pagamento = await consultarPagamento(dataId);

    if (pagamento.status !== "approved") {
      return NextResponse.json({ ok: true, status: pagamento.status });
    }

    const pedidoId = pagamento.external_reference;
    if (!pedidoId) {
      console.error(`pagamento ${dataId} aprovado sem external_reference`);
      return NextResponse.json({ ok: true });
    }

    const confirmado = await transacao(async (c) => {
      const { rows } = await c.query<{ confirmar_pedido: boolean }>(
        "select confirmar_pedido($1, $2)",
        [pedidoId, String(pagamento.id)],
      );
      return rows[0].confirmar_pedido;
    });

    return NextResponse.json({ ok: true, confirmado });
  } catch (e) {
    console.error("falha ao processar webhook:", e);
    // 200 de propósito: o evento está registrado e o cron reconcilia depois.
    return NextResponse.json({ ok: true, adiado: true });
  }
}
