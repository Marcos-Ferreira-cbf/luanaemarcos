"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type Padrinho = { nome: string; whatsapp: string | null; status: string };
export type Par = {
  codigo: string;
  enviado: boolean;
  pessoas: Padrinho[];
};

/**
 * O pedido de padrinho já escrito. É um pedido, não um aviso — por isso ele
 * não abre com data e endereço, abre com o convite de estar junto.
 */
function mensagemDePedido(nome: string, codigo: string, site: string): string {
  const primeiro = nome.trim().split(/\s+/)[0];
  return [
    `Oi, ${primeiro}!`,
    "",
    "A gente vai casar no dia 10 de outubro, e tem uma coisa que a gente queria pedir para vocês antes de contar para qualquer outra pessoa.",
    "",
    "Abre aqui:",
    `${site}/rsvp/${codigo}`,
    "",
    "O link é de vocês dois — cada um responde o seu ali mesmo.",
    "",
    "Com carinho, Luana e Marcos 💛",
  ].join("\n");
}

function rotuloStatus(p: Padrinho): string {
  if (p.status === "vem") return "aceitou";
  if (p.status === "nao_vem") return "não vai poder";
  return "sem resposta";
}

/**
 * O par entra numa linha só: dois nomes e dois números, lado a lado. É como a
 * Luana pensa neles, e é o que evita o erro de cadastrar metade do casal e
 * descobrir depois que o outro nunca recebeu o link.
 */
export default function PainelPadrinhos({ pares, site }: { pares: Par[]; site: string }) {
  const router = useRouter();
  const [, iniciar] = useTransition();

  const [n1, setN1] = useState("");
  const [w1, setW1] = useState("");
  const [n2, setN2] = useState("");
  const [w2, setW2] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch("/api/admin/padrinhos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pessoas: [
            { nome: n1, whatsapp: w1 },
            { nome: n2, whatsapp: w2 },
          ],
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(d.erro ?? "Não deu para salvar.");
        return;
      }
      setN1("");
      setW1("");
      setN2("");
      setW2("");
      iniciar(() => router.refresh());
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(codigo: string, nomes: string) {
    if (!confirm(`Apagar o convite de ${nomes}? O link para de funcionar.`)) return;
    setOcupado(codigo);
    try {
      await fetch("/api/admin/padrinhos", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      iniciar(() => router.refresh());
    } finally {
      setOcupado(null);
    }
  }

  return (
    <main className="painel">
      <div className="col">
        <div className="painel__topo">
          <Link href="/admin" className="rotulo" style={{ textDecoration: "none" }}>
            ← Painel
          </Link>
          <span className="rotulo">Padrinhos ({pares.length})</span>
        </div>

        <div className="par">
          <p className="rotulo" style={{ marginBottom: "1rem" }}>
            Novo par
          </p>

          <div className="par__linha">
            <input
              className="restricao par__nome"
              placeholder="Nome"
              value={n1}
              onChange={(e) => setN1(e.target.value)}
            />
            <input
              className="restricao par__zap"
              placeholder="WhatsApp com DDD"
              inputMode="tel"
              value={w1}
              onChange={(e) => setW1(e.target.value)}
            />
          </div>

          <div className="par__linha">
            <input
              className="restricao par__nome"
              placeholder="Nome (deixe vazio se for sozinho)"
              value={n2}
              onChange={(e) => setN2(e.target.value)}
            />
            <input
              className="restricao par__zap"
              placeholder="WhatsApp com DDD"
              inputMode="tel"
              value={w2}
              onChange={(e) => setW2(e.target.value)}
            />
          </div>

          {erro && <p className="folha__erro">{erro}</p>}

          <button
            className="btn btn--claro"
            style={{ marginTop: "1.2rem" }}
            disabled={salvando || !n1.trim()}
            onClick={salvar}
          >
            {salvando ? "Salvando…" : "Criar convite do par"}
          </button>
        </div>

        {pares.length === 0 && (
          <p className="texto" style={{ marginTop: "2rem" }}>
            Nenhum par cadastrado ainda. Cada par recebe um link só, e os dois respondem
            por ele.
          </p>
        )}

        {pares.map((par) => {
          const nomes = par.pessoas.map((p) => p.nome).join(" e ");
          return (
            <div className="cartao" key={par.codigo} data-feito={par.enviado}>
              <div className="cartao__linha">
                <span className="cartao__nome">{nomes}</span>
                <span className="cartao__codigo">{par.codigo}</span>
              </div>

              {par.pessoas.map((p) => (
                <p className="cartao__pessoa" data-status={p.status} key={p.nome}>
                  <span>{p.nome}</span>
                  <span>{rotuloStatus(p)}</span>
                </p>
              ))}

              <div className="cartao__acoes">
                {par.pessoas.map((p) =>
                  p.whatsapp ? (
                    <a
                      key={p.nome}
                      className="btn btn--linha btn--curto"
                      href={`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(
                        mensagemDePedido(p.nome, par.codigo, site),
                      )}`}
                      target="_blank"
                      rel="noopener"
                    >
                      Pedir a {p.nome.trim().split(/\s+/)[0]}
                    </a>
                  ) : (
                    <span className="cartao__meta" key={p.nome}>
                      {p.nome} sem número
                    </span>
                  ),
                )}

                <button
                  className="btn btn--linha btn--curto"
                  disabled={ocupado === par.codigo}
                  onClick={() => apagar(par.codigo, nomes)}
                >
                  {ocupado === par.codigo ? "…" : "Apagar"}
                </button>
              </div>

              <p className="cartao__meta">
                {site}/rsvp/{par.codigo}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
