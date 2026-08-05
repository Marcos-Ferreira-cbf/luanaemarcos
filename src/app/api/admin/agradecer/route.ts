import { NextResponse } from "next/server";
import { temSessao } from "@/lib/admin";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Marca (ou desmarca) que o obrigado foi enviado.
 *
 * Desmarcar existe porque errar é fácil: a Luana toca em "Enviei", o
 * WhatsApp não abriu, e sem o desfazer aquela pessoa nunca mais aparece na
 * fila — fica sem agradecimento e ninguém descobre.
 */
export async function POST(req: Request) {
  if (!(await temSessao())) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  let corpo: { pedidoId?: string; desfazer?: boolean };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (!corpo.pedidoId) {
    return NextResponse.json({ erro: "pedidoId ausente" }, { status: 400 });
  }

  const { rowCount } = await db.query(
    `update pedidos
        set agradecido_em = ${corpo.desfazer ? "null" : "now()"}
      where id = $1
        and status = 'pago'`,
    [corpo.pedidoId],
  );

  if (rowCount === 0) {
    return NextResponse.json({ erro: "pedido não encontrado ou não pago" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
