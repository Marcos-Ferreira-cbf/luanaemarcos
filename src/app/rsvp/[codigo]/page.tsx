import Link from "next/link";
import { notFound } from "next/navigation";
import FormularioRsvp from "@/components/FormularioRsvp";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Convidado = {
  id: string;
  nome: string;
  crianca: boolean;
  status: "pendente" | "vem" | "nao_vem";
  restricao_alimentar: string | null;
};

export default async function PaginaRsvp({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const normalizado = decodeURIComponent(codigo).trim().toUpperCase().slice(0, 12);

  // Um convite, um convidado. O nome na tela é o dele — o convite não guarda
  // nome nenhum, justamente para não existirem duas versões do mesmo.
  const { rows } = await db.query<{
    id: string;
    codigo: string;
    precisa_transporte: boolean;
    convidado: Convidado;
  }>(
    `select c.id, c.codigo, c.precisa_transporte,
            json_build_object(
              'id', g.id, 'nome', g.nome, 'crianca', g.crianca,
              'status', g.status, 'restricao_alimentar', g.restricao_alimentar
            ) as convidado
       from convites c
       join convidados g on g.convite_id = c.id
      where c.codigo = $1`,
    [normalizado],
  );

  // Código errado é 404 mesmo. Uma tela dizendo "esse convite não existe"
  // convidaria a tentar de novo até acertar algum.
  if (rows.length === 0) notFound();
  const convite = rows[0];

  return (
    <main className="bloco bloco--escuro" style={{ minHeight: "100svh" }}>
      <div className="col">
        <Link href="/" className="rotulo" style={{ textDecoration: "none" }}>
          ← Marcos &amp; Luana
        </Link>

        <h1 className="titulo" style={{ marginTop: "2rem" }}>
          {convite.convidado.nome}
        </h1>
        <p className="texto">
          Diga se você vem. Dá para mudar depois, é só voltar neste mesmo link — a gente
          fecha o almoço em 10 de setembro.
        </p>

        <FormularioRsvp
          codigo={convite.codigo}
          convidados={[convite.convidado]}
          precisaTransporte={convite.precisa_transporte}
        />
      </div>
    </main>
  );
}
