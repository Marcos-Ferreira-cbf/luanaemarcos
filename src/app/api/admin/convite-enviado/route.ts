import { NextResponse } from "next/server";
import { temSessao } from "@/lib/admin";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Marca (ou desmarca) que o convite daquela família já foi mandado.
 *
 * Mesma lógica do agradecimento, e pelo mesmo motivo: o botão abre o WhatsApp,
 * mas quem aperta enviar é a Luana. Sem o desfazer, um toque errado tira a
 * família da fila para sempre — e a pessoa nunca recebe o convite sem ninguém
 * perceber.
 *
 * A chave é o código do convite, não o id: é o que o painel já tem em mãos e
 * o que aparece na tela, então um erro fica visível.
 */
export async function POST(req: Request) {
  if (!(await temSessao())) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  let corpo: { codigo?: string; desfazer?: boolean };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (!corpo.codigo) {
    return NextResponse.json({ erro: "codigo ausente" }, { status: 400 });
  }

  const { rowCount } = await db.query(
    `update convites
        set convite_enviado_em = ${corpo.desfazer ? "null" : "now()"}
      where codigo = $1`,
    [corpo.codigo],
  );

  if (rowCount === 0) {
    return NextResponse.json({ erro: "convite não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
