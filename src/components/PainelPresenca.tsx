"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type PresencaPessoa = {
  id: string;
  nome: string;
  status: "pendente" | "vem" | "nao_vem";
  crianca: boolean;
  tipo: "individual" | "padrinhos";
  /** Quem mais responde pelo mesmo convite. Vazio no convite individual. */
  com: string[];
};

type Filtro = "vem" | "nao_vem" | "pendente" | "todos";

const ABAS: { chave: Filtro; rotulo: string }[] = [
  { chave: "vem", rotulo: "Confirmados" },
  { chave: "pendente", rotulo: "Sem resposta" },
  { chave: "nao_vem", rotulo: "Não vêm" },
  { chave: "todos", rotulo: "Todos" },
];

/**
 * A lista de quem vai ao casamento, padrinhos e convidados no mesmo lugar.
 *
 * Os padrinhos estavam de fora da aba de presença porque a consulta de lá
 * filtra convites individuais — necessário, porque um par vira duas linhas
 * com o mesmo código e quebra a lista de envio. Mas na hora de contar quem
 * senta à mesa a distinção não existe: são 24 pessoas que comem, e o buffet
 * não pergunta quem é padrinho.
 *
 * Abre em "Confirmados" de propósito. É a pergunta que se faz a esta tela —
 * as outras três são conferência.
 */
export default function PainelPresenca({ pessoas }: { pessoas: PresencaPessoa[] }) {
  const [filtro, setFiltro] = useState<Filtro>("vem");

  const contas = useMemo(() => {
    const vem = pessoas.filter((p) => p.status === "vem");
    return {
      vem: vem.length,
      nao_vem: pessoas.filter((p) => p.status === "nao_vem").length,
      pendente: pessoas.filter((p) => p.status === "pendente").length,
      todos: pessoas.length,
      criancas: vem.filter((p) => p.crianca).length,
    };
  }, [pessoas]);

  const lista = useMemo(
    () => (filtro === "todos" ? pessoas : pessoas.filter((p) => p.status === filtro)),
    [pessoas, filtro],
  );

  return (
    <main className="painel">
      <div className="col impressa">
        <div className="painel__topo impressa__esconder">
          <Link href="/admin" className="rotulo" style={{ textDecoration: "none" }}>
            ← Painel
          </Link>
          <button className="painel__sair" onClick={() => window.print()}>
            imprimir
          </button>
        </div>

        <h1 className="rotulo" style={{ marginTop: "1.5rem" }}>
          Presença · Luana &amp; Marcos · 10 de outubro
        </h1>

        <div className="painel__numeros">
          <Numero valor={contas.vem} rotulo="confirmados" />
          <Numero valor={contas.pendente} rotulo="sem resposta" />
          <Numero valor={contas.nao_vem} rotulo="não vêm" />
          <Numero valor={contas.criancas} rotulo="crianças" />
        </div>

        <div className="painel__abas impressa__esconder">
          {ABAS.map((a) => (
            <button
              key={a.chave}
              className="painel__aba"
              aria-pressed={filtro === a.chave}
              onClick={() => setFiltro(a.chave)}
            >
              {a.rotulo} ({contas[a.chave]})
            </button>
          ))}
        </div>

        {lista.length === 0 ? (
          <p className="texto" style={{ marginTop: "2rem" }}>
            {filtro === "vem"
              ? "Ninguém confirmou ainda. Os aceites aparecem aqui assim que as pessoas respondem pelo link."
              : "Ninguém nesta lista."}
          </p>
        ) : (
          <ol className="presenca">
            {lista.map((p, i) => (
              <li className="presenca__linha" data-status={p.status} key={p.id}>
                <span className="presenca__n" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="presenca__nome">
                  {p.nome}
                  {p.crianca && <span className="cartao__meta"> · criança</span>}
                  {p.tipo === "padrinhos" && <span className="cartao__meta"> · padrinho</span>}
                  {p.com.length > 0 && (
                    <span className="cartao__meta"> · com {p.com.join(", ")}</span>
                  )}
                </span>
                {filtro === "todos" && (
                  <span className="cartao__meta">
                    {p.status === "vem" ? "vem" : p.status === "nao_vem" ? "não vem" : "—"}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div>
      <p className="painel__num">{valor}</p>
      <p className="rotulo">{rotulo}</p>
    </div>
  );
}
