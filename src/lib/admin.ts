import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "sessao_admin";

/**
 * Sessão do painel.
 *
 * O cookie não guarda a senha, guarda um HMAC dela. Assim um cookie
 * vazado não revela a senha, e trocar ADMIN_SENHA invalida todas as
 * sessões abertas de uma vez — que é o que a gente quer se o notebook da
 * Luana sumir.
 *
 * Não há usuários, papéis nem expiração fina: são duas pessoas olhando a
 * própria festa. Sessão de sete dias e pronto.
 */
function esperado(): string | null {
  const senha = process.env.ADMIN_SENHA;
  if (!senha) return null;
  return createHmac("sha256", senha).update("painel-marcoseluana").digest("hex");
}

export function conferirSenha(enviada: string): string | null {
  const senha = process.env.ADMIN_SENHA;
  if (!senha || !enviada) return null;

  const a = Buffer.from(enviada);
  const b = Buffer.from(senha);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return esperado();
}

export async function temSessao(): Promise<boolean> {
  const alvo = esperado();
  if (!alvo) return false;

  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return false;

  const a = Buffer.from(valor);
  const b = Buffer.from(alvo);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const NOME_COOKIE = COOKIE;
export const DURACAO_SESSAO = 60 * 60 * 24 * 7; // 7 dias
