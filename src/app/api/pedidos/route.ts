import { NextResponse } from "next/server";
import { transacao } from "@/lib/db";
import { criarPagamentoPix } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MINUTOS_PARA_PAGAR = 30;

type ItemEntrada = { presenteId: string; cotas?: number };

/**
 * Cria um pedido e a cobrança Pix.
 *
 * Invariante 1: o corpo desta requisição NÃO tem campo de valor. O preço sai
 * de reservar_cotas(), que lê do banco. Cliente escolhe o quê e quantos, nunca
 * quanto custa.
 */
export async function POST(req: Request) {
  let corpo: { nome?: string; email?: string; mensagem?: string; itens?: ItemEntrada[] };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const nome = corpo.nome?.trim();
  const itens = corpo.itens;

  if (!nome) {
    return NextResponse.json({ erro: "informe seu nome" }, { status: 400 });
  }
  if (!Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ erro: "escolha ao menos um presente" }, { status: 400 });
  }

  const expiraEm = new Date(Date.now() + MINUTOS_PARA_PAGAR * 60_000);

  try {
    const pedido = await transacao(async (c) => {
      // Reserva primeiro. Se a última cota já foi, a check constraint derruba
      // a transação inteira aqui — sem pedido órfão, sem cobrança criada.
      let total = 0;
      const linhas: { presenteId: string; cotas: number; unitario: number }[] = [];

      for (const item of itens) {
        const cotas = Math.max(1, Math.floor(item.cotas ?? 1));
        const { rows } = await c.query<{ reservar_cotas: number }>(
          "select reservar_cotas($1, $2)",
          [item.presenteId, cotas],
        );
        const unitario = rows[0].reservar_cotas;
        total += unitario * cotas;
        linhas.push({ presenteId: item.presenteId, cotas, unitario });
      }

      const { rows: criado } = await c.query<{ id: string }>(
        `insert into pedidos (valor_centavos, metodo, nome_pagador, email_pagador, mensagem, expira_em)
         values ($1, 'pix', $2, $3, $4, $5)
         returning id`,
        [total, nome, corpo.email ?? null, corpo.mensagem ?? null, expiraEm],
      );
      const pedidoId = criado[0].id;

      for (const l of linhas) {
        await c.query(
          `insert into pedido_itens (pedido_id, presente_id, cotas, valor_unitario_centavos)
           values ($1, $2, $3, $4)`,
          [pedidoId, l.presenteId, l.cotas, l.unitario],
        );
      }

      return { id: pedidoId, total };
    });

    const pagamento = await criarPagamentoPix({
      pedidoId: pedido.id,
      valorCentavos: pedido.total,
      descricao: "Presente de casamento — Luana e Marcos",
      nome,
      email: corpo.email,
      expiraEm,
    });

    const dados = pagamento.point_of_interaction?.transaction_data;

    await transacao(async (c) => {
      await c.query(
        `update pedidos
            set psp_pagamento_id = $2, pix_qr_base64 = $3, pix_copia_e_cola = $4
          where id = $1`,
        [pedido.id, String(pagamento.id), dados?.qr_code_base64 ?? null, dados?.qr_code ?? null],
      );
    });

    return NextResponse.json({
      pedidoId: pedido.id,
      valorCentavos: pedido.total,
      qrBase64: dados?.qr_code_base64 ?? null,
      copiaECola: dados?.qr_code ?? null,
      expiraEm: expiraEm.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    // A check constraint cotas_dentro_da_meta é o "esgotou" chegando do banco.
    if (msg.includes("cotas_dentro_da_meta")) {
      return NextResponse.json(
        { erro: "esse presente acabou de esgotar. Escolha outro." },
        { status: 409 },
      );
    }
    console.error("falha ao criar pedido:", msg);
    return NextResponse.json({ erro: "não foi possível criar o pedido" }, { status: 500 });
  }
}
