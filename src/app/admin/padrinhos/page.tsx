import { redirect } from "next/navigation";
import PainelPadrinhos, { type Par } from "@/components/PainelPadrinhos";
import { temSessao } from "@/lib/admin";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function PaginaPadrinhos() {
  if (!(await temSessao())) redirect("/admin/entrar");

  // Aqui o convite é 1-para-N, então o agregado é obrigatório: sem o json_agg
  // o par viraria duas linhas e o mesmo link apareceria duas vezes na tela.
  const { rows } = await db.query<Par>(`
    select c.codigo, (c.convite_enviado_em is not null) as enviado,
           json_agg(json_build_object(
             'id', g.id, 'nome', g.nome,
             'whatsapp', coalesce(g.whatsapp, c.whatsapp), 'status', g.status
           ) order by g.nome) as pessoas
      from convites c
      join convidados g on g.convite_id = c.id
     where c.tipo = 'padrinhos'
     group by c.id
     order by (c.convite_enviado_em is not null), min(g.nome)
  `);

  const site = (process.env.APP_URL || "https://marcoseluana.social.br").replace(/\/$/, "");

  return <PainelPadrinhos pares={rows} site={site} />;
}
