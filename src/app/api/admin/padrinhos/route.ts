import { NextResponse } from "next/server";
import { temSessao } from "@/lib/admin";
import { gerarCodigo, normalizarTelefone } from "@/lib/codigo";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type Pessoa = { nome?: string; whatsapp?: string };

/**
 * Cadastra um par de padrinhos: um convite, um código, dois convidados.
 *
 * O par entra numa linha só porque é assim que a Luana pensa neles — "os
 * Correa", "o Léo e a Bia". Cada um guarda o próprio número, porque o link é
 * compartilhado mas o WhatsApp não: o mesmo convite vai para os dois
 * celulares, e cada um responde o seu aceite.
 *
 * Padrinho sozinho também vale — viúvo, irmã, amigo solteiro. Aí é um
 * convidado só, com o mesmo texto de pedido.
 */
export async function POST(req: Request) {
  if (!(await temSessao())) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  let corpo: { pessoas?: Pessoa[] };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const pessoas = (corpo.pessoas ?? [])
    .map((p) => ({
      nome: (p.nome ?? "").trim().slice(0, 120),
      whatsapp: normalizarTelefone(p.whatsapp),
    }))
    .filter((p) => p.nome);

  if (pessoas.length === 0) {
    return NextResponse.json({ erro: "informe pelo menos um nome" }, { status: 400 });
  }
  if (pessoas.length > 2) {
    return NextResponse.json({ erro: "um par tem no máximo duas pessoas" }, { status: 400 });
  }

  // Um número mal digitado é pior do que nenhum: o convite sai para um
  // estranho e a Luana só descobre pela resposta que nunca chega.
  const invalido = (corpo.pessoas ?? []).find(
    (p) => (p.whatsapp ?? "").trim() && !normalizarTelefone(p.whatsapp),
  );
  if (invalido) {
    return NextResponse.json(
      { erro: `número não reconhecido: "${invalido.whatsapp}". Use DDD + número.` },
      { status: 400 },
    );
  }

  const cliente = await db.connect();
  try {
    await cliente.query("begin");

    const jaExiste = await cliente.query(
      "select nome from convidados where lower(nome) = any($1::text[])",
      [pessoas.map((p) => p.nome.toLowerCase())],
    );
    if (jaExiste.rows.length > 0) {
      await cliente.query("rollback");
      return NextResponse.json(
        { erro: `${jaExiste.rows[0].nome} já está na lista.` },
        { status: 409 },
      );
    }

    // O código é sorteado, e a coluna é unique. Repetir é raro (30^6), mas
    // quando acontece a resposta certa é sortear de novo, não estourar.
    let conviteId: string | null = null;
    let codigo = "";
    for (let tentativa = 0; tentativa < 5 && !conviteId; tentativa++) {
      codigo = gerarCodigo();
      try {
        const r = await cliente.query<{ id: string }>(
          `insert into convites (codigo, whatsapp, tipo)
           values ($1, $2, 'padrinhos') returning id`,
          [codigo, pessoas[0].whatsapp],
        );
        conviteId = r.rows[0].id;
      } catch (e) {
        const codigoErro = (e as { code?: string }).code;
        if (codigoErro !== "23505") throw e;
        await cliente.query("rollback");
        await cliente.query("begin");
      }
    }
    if (!conviteId) throw new Error("não foi possível sortear um código livre");

    for (const p of pessoas) {
      await cliente.query(
        "insert into convidados (convite_id, nome, whatsapp) values ($1, $2, $3)",
        [conviteId, p.nome, p.whatsapp],
      );
    }

    await cliente.query("commit");
    return NextResponse.json({ codigo });
  } catch (e) {
    await cliente.query("rollback").catch(() => {});
    console.error("padrinhos:", e);
    return NextResponse.json({ erro: "não deu para salvar" }, { status: 500 });
  } finally {
    cliente.release();
  }
}

/** Apagar o par apaga os convidados junto, pelo on delete cascade. */
export async function DELETE(req: Request) {
  if (!(await temSessao())) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  let corpo: { codigo?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const codigo = (corpo.codigo ?? "").trim().toUpperCase().slice(0, 12);
  if (!codigo) return NextResponse.json({ erro: "código faltando" }, { status: 400 });

  // O filtro por tipo é a trava: esta rota é a tela de padrinhos, e um
  // código digitado errado não pode apagar o convite de um convidado comum.
  const r = await db.query(
    "delete from convites where codigo = $1 and tipo = 'padrinhos' returning codigo",
    [codigo],
  );
  if (r.rowCount === 0) {
    return NextResponse.json({ erro: "par não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
