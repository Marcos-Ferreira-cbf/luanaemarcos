import { NextResponse } from "next/server";
import { conferirSenha, DURACAO_SESSAO, NOME_COOKIE } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Espera um pouco antes de responder, sempre. Não é rate limit de verdade —
 * para isso precisaria de estado compartilhado entre réplicas — mas derruba
 * a taxa de tentativas de milhares por minuto para umas poucas, o que basta
 * contra força bruta numa senha decente.
 */
function respirar() {
  return new Promise((r) => setTimeout(r, 700));
}

export async function POST(req: Request) {
  let corpo: { senha?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  await respirar();

  const token = conferirSenha(corpo.senha ?? "");
  if (!token) {
    return NextResponse.json({ erro: "senha incorreta" }, { status: 401 });
  }

  const r = NextResponse.json({ ok: true });
  r.cookies.set(NOME_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SESSAO,
  });
  return r;
}

export async function DELETE() {
  const r = NextResponse.json({ ok: true });
  r.cookies.delete(NOME_COOKIE);
  return r;
}
