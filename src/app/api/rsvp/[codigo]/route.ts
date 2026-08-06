import { NextResponse } from "next/server";
import { db, transacao } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ codigo: string }> };

function normalizar(codigo: string): string {
  return codigo.trim().toUpperCase().slice(0, 12);
}

/** Devolve o convidado daquele código. Ninguém digita quem é. */
export async function GET(_req: Request, ctx: Contexto) {
  const { codigo } = await ctx.params;

  const { rows } = await db.query(
    `select c.id, c.precisa_transporte,
            json_build_object(
              'id', g.id, 'nome', g.nome, 'crianca', g.crianca, 'status', g.status
            ) as convidado
       from convites c
       join convidados g on g.convite_id = c.id
      where c.codigo = $1`,
    [normalizar(codigo)],
  );

  if (rows.length === 0) {
    return NextResponse.json({ erro: "convite não encontrado" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

/**
 * Registra as respostas. Só aceita ids que pertencem a este convite — sem
 * isso, quem tem um código válido responderia pelo convite dos outros.
 */
export async function POST(req: Request, ctx: Contexto) {
  const { codigo } = await ctx.params;

  let corpo: {
    respostas?: { id: string; status: "vem" | "nao_vem"; restricaoAlimentar?: string }[];
    precisaTransporte?: boolean;
  };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const respostas = corpo.respostas;
  if (!Array.isArray(respostas) || respostas.length === 0) {
    return NextResponse.json({ erro: "nenhuma resposta enviada" }, { status: 400 });
  }
  if (respostas.some((r) => r.status !== "vem" && r.status !== "nao_vem")) {
    return NextResponse.json({ erro: "status inválido" }, { status: 400 });
  }

  const atualizados = await transacao(async (c) => {
    const { rows } = await c.query<{ id: string }>(
      "select id from convites where codigo = $1",
      [normalizar(codigo)],
    );
    if (rows.length === 0) return null;
    const conviteId = rows[0].id;

    let n = 0;
    for (const r of respostas) {
      const { rowCount } = await c.query(
        `update convidados
            set status = $3,
                restricao_alimentar = $4,
                respondido_em = now()
          where id = $1
            and convite_id = $2`,
        [r.id, conviteId, r.status, r.restricaoAlimentar ?? null],
      );
      n += rowCount ?? 0;
    }

    if (typeof corpo.precisaTransporte === "boolean") {
      await c.query("update convites set precisa_transporte = $2 where id = $1", [
        conviteId,
        corpo.precisaTransporte,
      ]);
    }

    return n;
  });

  if (atualizados === null) {
    return NextResponse.json({ erro: "convite não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, atualizados });
}
