import type { Metadata } from "next";
import Link from "next/link";
import Convite, { type ModeloConvite } from "@/components/Convite";
import { script } from "@/lib/fontes";

export const runtime = "nodejs";

/**
 * Página de decisão, não de convidado: mostra os três modelos com um nome de
 * exemplo para escolher um. Não tem link para cá em lugar nenhum do site, e
 * os buscadores são mandados embora — mas ela é pública, então usa um nome
 * inventado, nunca o de alguém da lista.
 */
export const metadata: Metadata = {
  title: "Modelos de convite",
  robots: { index: false, follow: false },
};

const NOME = "Maria Aparecida";


const MODELOS: { chave: ModeloConvite; titulo: string; nota: string }[] = [
  {
    chave: "folhagem",
    titulo: "1 · Folhagem",
    nota: "Desenho vetorial, sem foto. Imprime igual em qualquer papel e não envelhece — é o que está no ar hoje.",
  },
  {
    chave: "faixa",
    titulo: "2 · Faixa de fotos",
    nota: "Três fotos em tira com a data vazada por cima. O filtro preto e branco é do site, então trocar as fotos não exige edição.",
  },
  {
    chave: "retrato",
    titulo: "3 · Salve a data",
    nota: "Uma foto grande e tipografia sóbria. É o mais bonito impresso — e o que mais depende da foto escolhida.",
  },
];

export default function PaginaModelos() {
  return (
    <main className="bloco bloco--escuro comparar" style={{ minHeight: "100svh" }}>
      <div className="col">
        <Link href="/" className="rotulo" style={{ textDecoration: "none" }}>
          ← Luana &amp; Marcos
        </Link>

        <h1 className="titulo" style={{ marginTop: "2rem" }}>
          Três modelos
        </h1>
        <p className="texto">
          O mesmo convite com três roupas. Escolhe um e ele passa a ser o que todo mundo
          recebe — dá para trocar depois sem refazer nada. O nome aqui é de exemplo; no
          convite de verdade entra o nome de cada convidado.
        </p>

        <div className={script.variable}>
          {MODELOS.map((m) => (
            <section key={m.chave} style={{ marginTop: "3.5rem" }}>
              <p className="rotulo">{m.titulo}</p>
              <p className="texto" style={{ marginBottom: "1.5rem" }}>
                {m.nota}
              </p>
              <Convite nome={NOME} modelo={m.chave} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
