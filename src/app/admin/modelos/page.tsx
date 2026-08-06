import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Convite, { type ModeloConvite } from "@/components/Convite";
import { temSessao } from "@/lib/admin";
import { script } from "@/lib/fontes";

export const runtime = "nodejs";

/**
 * Página de decisão, não de convidado: mostra os modelos com um nome de
 * exemplo para o casal escolher um. Mora dentro do admin porque é controle,
 * não conteúdo — e assim o nome de exemplo não fica exposto num endereço
 * público que alguém possa achar por acaso.
 */
export const metadata: Metadata = {
  title: "Modelos de convite",
  robots: { index: false, follow: false },
};

const NOME = "Maria Aparecida";
const PAR = "Maria Aparecida e João Batista";

const MODELOS: { chave: ModeloConvite; nome: string; titulo: string; nota: string }[] = [
  {
    chave: "retrato",
    nome: NOME,
    titulo: "Convidado · em uso",
    nota: "É o que todo convidado recebe hoje. Uma foto grande e tipografia sóbria — o mais bonito impresso.",
  },
  {
    chave: "padrinhos",
    nome: PAR,
    titulo: "Padrinhos · em uso",
    nota: "Mesma arte, texto de pedido. Os dois nomes numa linha só, porque o link é do casal e cada um responde o seu aceite.",
  },
  {
    chave: "folhagem",
    nome: NOME,
    titulo: "Alternativa · folhagem",
    nota: "Desenho vetorial, sem foto. Imprime igual em qualquer papel e não envelhece.",
  },
  {
    chave: "faixa",
    nome: NOME,
    titulo: "Alternativa · faixa de fotos",
    nota: "Três fotos em tira com a data vazada por cima. O filtro preto e branco é do site, então trocar as fotos não exige edição.",
  },
];

export default async function PaginaModelos() {
  if (!(await temSessao())) redirect("/admin/entrar");

  return (
    <main className="bloco bloco--escuro comparar" style={{ minHeight: "100svh" }}>
      <div className="col">
        <Link href="/admin" className="rotulo" style={{ textDecoration: "none" }}>
          ← Painel
        </Link>

        <h1 className="titulo" style={{ marginTop: "2rem" }}>
          Modelos de convite
        </h1>
        <p className="texto">
          Os dois primeiros são os que estão no ar. Os outros ficam guardados: trocar é
          uma linha de código, sem refazer nada. O nome aqui é de exemplo — no convite de
          verdade entra o nome de cada convidado.
        </p>

        <div className={script.variable}>
          {MODELOS.map((m) => (
            <section key={m.chave} style={{ marginTop: "3.5rem" }}>
              <p className="rotulo">{m.titulo}</p>
              <p className="texto" style={{ marginBottom: "1.5rem" }}>
                {m.nota}
              </p>
              <Convite nome={m.nome} modelo={m.chave} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
