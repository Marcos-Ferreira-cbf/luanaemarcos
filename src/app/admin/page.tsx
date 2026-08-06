import { redirect } from "next/navigation";
import PainelAdmin from "@/components/PainelAdmin";
import { temSessao } from "@/lib/admin";
import { db } from "@/lib/db";
import type { PedidoPago, Resumo, ConviteResumo } from "@/lib/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

async function carregar() {
  const [resumo, pagos, convites] = await Promise.all([
    db.query<Resumo>(`
      select
        (select coalesce(sum(valor_centavos), 0) from pedidos where status = 'pago')      as arrecadado_centavos,
        (select count(*) from pedidos where status = 'pago')                              as pagos,
        (select count(*) from pedidos where status = 'pendente')                          as pendentes,
        (select count(*) from pedidos where status = 'pago' and agradecido_em is null)    as a_agradecer,
        (select count(*) from convidados where status = 'vem')                            as vem,
        (select count(*) from convidados where status = 'nao_vem')                        as nao_vem,
        (select count(*) from convidados where status = 'pendente')                       as sem_resposta,
        (select count(*) from convites where precisa_transporte)                          as com_transporte,
        (select count(*) from convites where convite_enviado_em is null)                  as convites_a_enviar
    `),

    // Quem ainda não recebeu obrigado vem primeiro: é a fila de trabalho da
    // Luana, não um extrato em ordem cronológica.
    db.query<PedidoPago>(`
      select p.id, p.nome_pagador, p.whatsapp_pagador, p.mensagem,
             p.valor_centavos, p.pago_em, p.agradecido_em,
             string_agg(
               pr.nome || case when pi.cotas > 1 then ' ×' || pi.cotas else '' end,
               ', ' order by pr.nome
             ) as presentes
        from pedidos p
        join pedido_itens pi on pi.pedido_id = p.id
        join presentes pr    on pr.id = pi.presente_id
       where p.status = 'pago'
       group by p.id
       order by (p.agradecido_em is not null), p.pago_em desc
    `),

    // Um convite, um convidado — o join é 1-para-1, sem agregação.
    db.query<ConviteResumo>(`
      select c.codigo, c.precisa_transporte, c.whatsapp, c.convite_enviado_em,
             g.nome, g.status, g.crianca,
             g.restricao_alimentar as restricao
        from convites c
        join convidados g on g.convite_id = c.id
       order by (c.convite_enviado_em is not null), g.nome
    `),
  ]);

  return {
    resumo: resumo.rows[0],
    pagos: pagos.rows,
    convites: convites.rows,
  };
}

export default async function PaginaAdmin() {
  if (!(await temSessao())) redirect("/admin/entrar");

  const { resumo, pagos, convites } = await carregar();

  // O link do convite tem que ser o público, não o host da requisição: a Luana
  // pode abrir o painel pela URL temporária do Azure, e o convidado não vai
  // receber aquilo. APP_URL é a mesma env que alimenta o notification_url.
  const site = (process.env.APP_URL || "https://marcoseluana.social.br").replace(/\/$/, "");

  return <PainelAdmin resumo={resumo} pagos={pagos} convites={convites} site={site} />;
}
