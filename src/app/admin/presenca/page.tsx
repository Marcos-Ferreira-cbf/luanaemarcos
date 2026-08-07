import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PainelPresenca, { type PresencaPessoa } from "@/components/PainelPresenca";
import { temSessao } from "@/lib/admin";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Presença",
  robots: { index: false, follow: false },
};

/**
 * Quem vai ao casamento — padrinhos e convidados na mesma lista.
 *
 * A aba de presença do painel nasceu da consulta de convites, que filtra
 * `tipo = 'individual'` porque um par de padrinhos vira duas linhas com o
 * mesmo código e estragaria a lista de envio. O efeito colateral era o
 * contador do topo dizer "12 confirmados" contando padrinhos, enquanto a
 * lista embaixo mostrava só os individuais — dois números para a mesma
 * pergunta, e nenhum jeito de saber qual valia.
 *
 * Aqui a pergunta é outra e não tem tipo: quantas pessoas sentam à mesa.
 */
export default async function PaginaPresenca() {
  if (!(await temSessao())) redirect("/admin/entrar");

  // O `com` sai de uma subconsulta no mesmo convite em vez de um segundo
  // round-trip: são 110 pessoas, e 110 consultas para descobrir o par de cada
  // uma é o problema N+1 pago à toa numa lista que já está toda na mão.
  const { rows } = await db.query<PresencaPessoa>(`
    select g.id, g.nome, g.status, g.crianca,
           g.restricao_alimentar as restricao,
           c.tipo, c.precisa_transporte,
           coalesce(
             (select array_agg(o.nome order by o.nome)
                from convidados o
               where o.convite_id = c.id and o.id <> g.id),
             '{}'
           ) as com
      from convidados g
      join convites c on c.id = g.convite_id
     order by g.nome
  `);

  return <PainelPresenca pessoas={rows} />;
}
