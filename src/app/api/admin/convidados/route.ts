import { NextResponse } from "next/server";
import { temSessao } from "@/lib/admin";
import { normalizarTelefone } from "@/lib/codigo";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Corrige o nome ou o número de um convidado já cadastrado.
 *
 * Serve tanto para os padrinhos quanto para o convite individual, porque o
 * erro é o mesmo nos dois: um dígito trocado na hora de digitar a lista. A
 * diferença é onde o número mora — no par, cada pessoa guarda o seu; no
 * convite individual, o número é do convite, que tem uma pessoa só.
 */
export async function PATCH(req: Request) {
  if (!(await temSessao())) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  let corpo: { id?: string; nome?: string; whatsapp?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const id = (corpo.id ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ erro: "convidado inválido" }, { status: 400 });
  }

  const mudaNome = corpo.nome !== undefined;
  const mudaZap = corpo.whatsapp !== undefined;
  if (!mudaNome && !mudaZap) {
    return NextResponse.json({ erro: "nada para alterar" }, { status: 400 });
  }

  const nome = (corpo.nome ?? "").trim().slice(0, 120);
  if (mudaNome && !nome) {
    return NextResponse.json({ erro: "o nome não pode ficar vazio" }, { status: 400 });
  }

  // Campo apagado de propósito vira null — é como se diz "esta pessoa não tem
  // WhatsApp", e o painel passa a mostrar "sem número" em vez de um botão que
  // abriria conversa nenhuma.
  let zap: string | null = null;
  if (mudaZap) {
    const bruto = (corpo.whatsapp ?? "").trim();
    if (bruto) {
      zap = normalizarTelefone(bruto);
      if (!zap) {
        return NextResponse.json(
          { erro: `número não reconhecido: "${bruto}". Use DDD + número.` },
          { status: 400 },
        );
      }
    }
  }

  const cliente = await db.connect();
  try {
    await cliente.query("begin");

    const atual = await cliente.query<{ convite_id: string; tipo: string }>(
      `select g.convite_id, c.tipo
         from convidados g join convites c on c.id = g.convite_id
        where g.id = $1`,
      [id],
    );
    if (atual.rowCount === 0) {
      await cliente.query("rollback");
      return NextResponse.json({ erro: "convidado não encontrado" }, { status: 404 });
    }

    // Dois convidados com o mesmo nome quebram a conferência: a lista fica com
    // duas linhas iguais e ninguém sabe qual link é de quem.
    if (mudaNome) {
      const repetido = await cliente.query(
        "select 1 from convidados where lower(nome) = lower($1) and id <> $2",
        [nome, id],
      );
      if (repetido.rowCount! > 0) {
        await cliente.query("rollback");
        return NextResponse.json({ erro: `${nome} já está na lista.` }, { status: 409 });
      }
      await cliente.query("update convidados set nome = $1 where id = $2", [nome, id]);
    }

    if (mudaZap) {
      await cliente.query("update convidados set whatsapp = $1 where id = $2", [zap, id]);

      // No convite individual a pessoa e o convite são a mesma coisa, e o
      // número do convite é o que a tela de presentes usa. Deixar os dois
      // diferentes criaria a pergunta "qual dos dois é o certo?".
      if (atual.rows[0].tipo === "individual") {
        await cliente.query("update convites set whatsapp = $1 where id = $2", [
          zap,
          atual.rows[0].convite_id,
        ]);
      }
    }

    await cliente.query("commit");
    return NextResponse.json({ ok: true, nome: mudaNome ? nome : undefined, whatsapp: zap });
  } catch (e) {
    await cliente.query("rollback").catch(() => {});
    console.error("editar convidado:", e);
    return NextResponse.json({ erro: "não deu para salvar" }, { status: 500 });
  } finally {
    cliente.release();
  }
}
