import Link from "next/link";
import { notFound } from "next/navigation";
import Convite from "@/components/Convite";
import FormularioRsvp from "@/components/FormularioRsvp";
import { db } from "@/lib/db";
import { script } from "@/lib/fontes";
import { juntarNomes } from "@/lib/nomes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Convidado = {
  id: string;
  nome: string;
  crianca: boolean;
  status: "pendente" | "vem" | "nao_vem";
};

export default async function PaginaRsvp({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const normalizado = decodeURIComponent(codigo).trim().toUpperCase().slice(0, 12);

  // Quase todo convite tem um convidado só; o de padrinhos tem o casal. O
  // convite não guarda nome nenhum, justamente para não existirem duas
  // versões do mesmo — quem tem nome é o convidado.
  const { rows } = await db.query<{
    id: string;
    codigo: string;
    tipo: "individual" | "padrinhos";
    convidados: Convidado[];
  }>(
    `select c.id, c.codigo, c.tipo,
            json_agg(
              json_build_object(
                'id', g.id, 'nome', g.nome, 'crianca', g.crianca, 'status', g.status
              ) order by g.nome
            ) as convidados
       from convites c
       join convidados g on g.convite_id = c.id
      where c.codigo = $1
      group by c.id`,
    [normalizado],
  );

  // Código errado é 404 mesmo. Uma tela dizendo "esse convite não existe"
  // convidaria a tentar de novo até acertar algum.
  if (rows.length === 0) notFound();
  const convite = rows[0];
  const padrinhos = convite.tipo === "padrinhos";

  // O pedido é aos dois, então a peça traz os dois.
  const nome = juntarNomes(convite.convidados.map((g) => g.nome));

  return (
    <main className="bloco bloco--escuro" style={{ minHeight: "100svh" }}>
      <div className="col">
        <Link href="/" className="rotulo" style={{ textDecoration: "none" }}>
          ← Luana &amp; Marcos
        </Link>

        {/* O nome tem que estar acima da peça, não só dentro dela.
            Dentro, ele fica embaixo da foto grande — no celular isso é uma
            rolagem inteira depois do topo, e quem abre o link vê primeiro uma
            foto que podia ser de qualquer convite. O link é pessoal e precisa
            parecer pessoal na primeira tela, antes de qualquer coisa. */}
        <p className="rotulo" style={{ marginTop: "2.5rem" }}>
          {padrinhos ? "Um pedido para" : "Convite de"}
        </p>
        <h1 className="titulo" style={{ marginTop: ".4rem" }}>
          {nome}
        </h1>

        {/* O convite vem antes do formulário: a pessoa abriu o link para ver o
            convite dela, não para responder um questionário. */}
        {/* A caligrafia entra só aqui: é a única tela do site que a usa, e
            pendurá-la no layout faria a home baixar uma fonte que não mostra. */}
        <div className={script.variable} style={{ marginTop: "2rem" }}>
          <Convite nome={nome} modelo={padrinhos ? "padrinhos" : "retrato"} />
        </div>

        <h2 className="titulo" style={{ marginTop: "4rem", fontSize: "clamp(1.8rem,7vw,2.4rem)" }}>
          {padrinhos ? "E aí, aceitam?" : "Você vem?"}
        </h2>
        <p className="texto">
          {padrinhos
            ? "Cada um responde o seu — e dá para mudar depois, é só voltar neste mesmo link."
            : "Dá para mudar depois, é só voltar neste mesmo link — a gente fecha o almoço em 10 de setembro."}
        </p>

        <FormularioRsvp
          codigo={convite.codigo}
          convidados={convite.convidados}
          padrinhos={padrinhos}
        />
      </div>
    </main>
  );
}
