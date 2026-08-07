"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import CampoEditavel from "@/components/CampoEditavel";
import { editarConvidado } from "@/lib/editar";
import { telefoneBonito } from "@/lib/formato";
import { linkWhatsapp } from "@/lib/whatsapp";

export type Padrinho = { id: string; nome: string; whatsapp: string | null; status: string };
export type Par = {
  codigo: string;
  enviado: boolean;
  pessoas: Padrinho[];
};

/** O primeiro nome é como se chama alguém no WhatsApp. Nome inteiro é cobrança. */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0];
}

/**
 * O pedido de padrinho já escrito.
 *
 * O convite em si não vem aqui — vem na página do link. É um pedido, e um
 * pedido dito de corpo inteiro numa mensagem de texto vira aviso; a página
 * tem a foto, o nome dos dois e o tempo de ler com calma, que é o que a
 * ocasião pede. A mensagem só precisa fazer a pessoa querer abrir.
 *
 * Por isso as frases são curtas e a data vem na primeira linha: no WhatsApp
 * só as duas primeiras linhas aparecem na notificação, e "a gente casa dia 10
 * de outubro" já explica sozinho por que vale abrir. Enterrar isso no
 * parágrafo faria a prévia mostrar só "Oi, Anderson!".
 *
 * O par é nomeado inteiro — quem recebe está sendo chamado junto com quem
 * ama, e ler o nome do outro ali é metade do recado.
 */
function mensagemDePedido(p: Padrinho, par: Par, site: string): string {
  const outro = par.pessoas.find((x) => x.id !== p.id);
  const juntos = outro
    ? `para você e para ${primeiroNome(outro.nome)}`
    : "para você";

  return [
    `Oi, ${primeiroNome(p.nome)}!`,
    "",
    "Dia 10 de outubro a gente casa. 💛",
    "",
    `Antes de contar para qualquer outra pessoa, a gente tem um convite ${juntos} — e ele não cabe numa mensagem.`,
    "",
    outro ? "Abram aqui, com calma:" : "Abre aqui, com calma:",
    `${site}/rsvp/${par.codigo}`,
    "",
    outro
      ? "O link é de vocês dois: cada um responde o seu ali mesmo."
      : "É só responder ali mesmo.",
    "",
    "Luana e Marcos",
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

  // O refresh só depois do salvo: recarregar antes devolveria o valor antigo e
  // pareceria que a edição não pegou.
  async function editar(id: string, dados: { nome?: string; whatsapp?: string }) {
    const problema = await editarConvidado(id, dados);
    if (!problema) iniciar(() => router.refresh());
    return problema;
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
              className="par__campo par__nome"
              placeholder="Nome"
              value={n1}
              onChange={(e) => setN1(e.target.value)}
            />
            <input
              className="par__campo par__zap"
              placeholder="WhatsApp com DDD"
              inputMode="tel"
              value={w1}
              onChange={(e) => setW1(e.target.value)}
            />
          </div>

          <div className="par__linha">
            <input
              className="par__campo par__nome"
              placeholder="Nome (deixe vazio se for sozinho)"
              value={n2}
              onChange={(e) => setN2(e.target.value)}
            />
            <input
              className="par__campo par__zap"
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
                <p className="cartao__pessoa" data-status={p.status} key={p.id}>
                  <CampoEditavel
                    bruto={p.nome}
                    exibido={p.nome}
                    vazio="sem nome"
                    rotulo="Nome"
                    aoSalvar={(novo) => editar(p.id, { nome: novo })}
                  />
                  <CampoEditavel
                    bruto={p.whatsapp}
                    exibido={telefoneBonito(p.whatsapp)}
                    vazio="sem número"
                    rotulo={`WhatsApp de ${p.nome}`}
                    tipo="tel"
                    aoSalvar={(novo) => editar(p.id, { whatsapp: novo })}
                  />
                  <span className="cartao__meta">{rotuloStatus(p)}</span>
                </p>
              ))}

              <div className="cartao__acoes">
                {par.pessoas.map((p) =>
                  p.whatsapp ? (
                    <a
                      key={p.id}
                      className="btn btn--linha btn--curto"
                      href={linkWhatsapp(p.whatsapp, mensagemDePedido(p, par, site))}
                    >
                      Pedir a {primeiroNome(p.nome)}
                    </a>
                  ) : (
                    <span className="cartao__meta" key={p.id}>
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
