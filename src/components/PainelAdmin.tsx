"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { reais } from "@/lib/formato";
import type { ConviteResumo, PedidoPago, Resumo } from "@/lib/tipos";

/** O obrigado já escrito. A Luana lê, ajusta se quiser, e envia. */
function mensagemDeAgradecimento(p: PedidoPago): string {
  const primeiro = p.nome_pagador.trim().split(/\s+/)[0];
  const linhas = [
    `Oi, ${primeiro}! Aqui é a Luana.`,
    "",
    `Acabei de ver o seu presente — ${p.presentes}. Muito obrigada mesmo, de coração. Ficamos felizes demais.`,
  ];
  if (p.mensagem?.trim()) {
    linhas.push("", `E o seu recado a gente leu e guardou. 💛`);
  }
  linhas.push("", "Te esperamos dia 10 de outubro!");
  return linhas.join("\n");
}

function quando(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <p className="painel__num">{valor}</p>
      <p className="rotulo">{rotulo}</p>
    </div>
  );
}

export default function PainelAdmin({
  resumo,
  pagos,
  convites,
}: {
  resumo: Resumo;
  pagos: PedidoPago[];
  convites: ConviteResumo[];
}) {
  const router = useRouter();
  const [aba, setAba] = useState<"presentes" | "presenca">("presentes");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  const aAgradecer = Number(resumo.a_agradecer);

  async function marcar(pedidoId: string, desfazer: boolean) {
    setOcupado(pedidoId);
    try {
      await fetch("/api/admin/agradecer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pedidoId, desfazer }),
      });
      iniciar(() => router.refresh());
    } finally {
      setOcupado(null);
    }
  }

  async function sair() {
    await fetch("/api/admin/entrar", { method: "DELETE" });
    router.push("/admin/entrar");
    router.refresh();
  }

  const restricoes = useMemo(
    () =>
      convites.flatMap((c) =>
        c.pessoas
          .filter((p) => p.status === "vem" && p.restricao?.trim())
          .map((p) => `${p.nome}: ${p.restricao}`),
      ),
    [convites],
  );

  return (
    <main className="painel">
      <div className="col">
        <div className="painel__topo">
          <p className="rotulo">Painel · Marcos &amp; Luana</p>
          <button className="painel__sair" onClick={sair}>
            sair
          </button>
        </div>

        <div className="painel__numeros">
          <Numero valor={reais(Number(resumo.arrecadado_centavos))} rotulo="arrecadado" />
          <Numero valor={resumo.vem} rotulo="confirmados" />
          <Numero valor={resumo.sem_resposta} rotulo="sem resposta" />
          <Numero valor={String(aAgradecer)} rotulo="a agradecer" />
        </div>

        <div className="painel__abas">
          <button
            className="painel__aba"
            aria-pressed={aba === "presentes"}
            onClick={() => setAba("presentes")}
          >
            Presentes ({pagos.length})
          </button>
          <button
            className="painel__aba"
            aria-pressed={aba === "presenca"}
            onClick={() => setAba("presenca")}
          >
            Presença ({convites.length})
          </button>
        </div>

        {aba === "presentes" ? (
          <>
            {pagos.length === 0 && (
              <p className="texto" style={{ marginTop: "2rem" }}>
                Nenhum presente pago ainda. Quando alguém pagar, aparece aqui com o
                botão de agradecer.
              </p>
            )}

            {pagos.map((p) => {
              const feito = p.agradecido_em !== null;
              return (
                <div className="cartao" key={p.id} data-feito={feito}>
                  <div className="cartao__linha">
                    <span className="cartao__nome">{p.nome_pagador}</span>
                    <span className="cartao__valor">{reais(p.valor_centavos)}</span>
                  </div>
                  <p className="cartao__presente">{p.presentes}</p>
                  {p.mensagem && <p className="cartao__recado">“{p.mensagem}”</p>}
                  <p className="cartao__meta">
                    pago em {quando(p.pago_em)}
                    {feito && ` · agradecido em ${quando(p.agradecido_em!)}`}
                    {!p.whatsapp_pagador && " · sem WhatsApp"}
                  </p>

                  <div className="cartao__acoes">
                    {p.whatsapp_pagador ? (
                      <a
                        className="btn btn--linha btn--curto"
                        href={`https://wa.me/${p.whatsapp_pagador}?text=${encodeURIComponent(
                          mensagemDeAgradecimento(p),
                        )}`}
                        target="_blank"
                        rel="noopener"
                      >
                        {feito ? "Abrir conversa" : "Escrever obrigado"}
                      </a>
                    ) : (
                      <span className="cartao__meta">
                        não deixou número — agradeça pessoalmente
                      </span>
                    )}

                    <button
                      className="btn btn--linha btn--curto"
                      disabled={ocupado === p.id}
                      onClick={() => marcar(p.id, feito)}
                    >
                      {ocupado === p.id ? "…" : feito ? "Desmarcar" : "Já enviei"}
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            {restricoes.length > 0 && (
              <div className="cartao">
                <p className="rotulo">Restrições alimentares</p>
                {restricoes.map((r) => (
                  <p className="cartao__presente" key={r}>
                    {r}
                  </p>
                ))}
              </div>
            )}

            {convites.length === 0 && (
              <p className="texto" style={{ marginTop: "2rem" }}>
                Nenhum convite cadastrado ainda.
              </p>
            )}

            {convites.map((c) => (
              <div className="cartao" key={c.codigo}>
                <div className="cartao__linha">
                  <span className="cartao__nome">{c.familia}</span>
                  <span className="cartao__codigo">{c.codigo}</span>
                </div>
                {c.pessoas.map((p) => (
                  <p className="cartao__pessoa" key={p.nome} data-status={p.status}>
                    <span>
                      {p.nome}
                      {p.crianca && <span className="cartao__meta"> · criança</span>}
                    </span>
                    <span>
                      {p.status === "vem" ? "vem" : p.status === "nao_vem" ? "não vem" : "—"}
                    </span>
                  </p>
                ))}
                {c.precisa_transporte && (
                  <p className="cartao__meta">precisa de carona para o sítio</p>
                )}
              </div>
            ))}
          </>
        )}

        <p className="cartao__meta" style={{ margin: "3rem 0" }}>
          {resumo.pendentes} pedido(s) pendente(s) · {resumo.nao_vem} não vêm ·{" "}
          {resumo.com_transporte} convite(s) pedindo carona
        </p>
      </div>
    </main>
  );
}
