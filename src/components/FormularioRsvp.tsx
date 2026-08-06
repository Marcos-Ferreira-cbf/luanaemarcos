"use client";

import { useState } from "react";

type Convidado = {
  id: string;
  nome: string;
  crianca: boolean;
  status: "pendente" | "vem" | "nao_vem";
  restricao_alimentar: string | null;
};

/**
 * O nome já vem do banco: ninguém digita quem é. O convidado só toca em
 * "Vou" ou "Não vou" — um toque, e acabou.
 *
 * Hoje o convite é individual, então a lista tem sempre uma pessoa. O
 * componente continua aceitando várias porque o custo é zero e a alternativa
 * seria reescrevê-lo se algum convite voltar a valer para duas.
 *
 * Enviar exige que todos tenham respondido. Meio convite respondido é pior
 * do que nenhum: o casal não sabe se o silêncio é "não vem" ou "esqueceu".
 */
export default function FormularioRsvp({
  codigo,
  convidados,
  precisaTransporte,
}: {
  codigo: string;
  convidados: Convidado[];
  precisaTransporte: boolean;
}) {
  const [respostas, setRespostas] = useState<Record<string, "vem" | "nao_vem">>(() =>
    Object.fromEntries(
      convidados
        .filter((c) => c.status !== "pendente")
        .map((c) => [c.id, c.status as "vem" | "nao_vem"]),
    ),
  );
  const [restricoes, setRestricoes] = useState<Record<string, string>>(() =>
    Object.fromEntries(convidados.map((c) => [c.id, c.restricao_alimentar ?? ""])),
  );
  const [transporte, setTransporte] = useState(precisaTransporte);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  const faltam = convidados.filter((c) => !respostas[c.id]).length;
  const vem = convidados.filter((c) => respostas[c.id] === "vem").length;

  async function enviar() {
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/rsvp/${encodeURIComponent(codigo)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          precisaTransporte: transporte,
          respostas: convidados.map((c) => ({
            id: c.id,
            status: respostas[c.id],
            restricaoAlimentar:
              respostas[c.id] === "vem" ? restricoes[c.id]?.trim() || undefined : undefined,
          })),
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErro(d.erro ?? "Não deu para salvar. Tente de novo.");
        return;
      }
      setPronto(true);
    } catch {
      setErro("Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (pronto) {
    return (
      <div style={{ marginTop: "2.5rem" }}>
        <p className="titulo" style={{ fontSize: "clamp(1.8rem,7vw,2.4rem)" }}>
          {vem > 0 ? "Que bom. Até lá." : "Obrigado por avisar."}
        </p>
        <p className="texto">
          {vem > 0
            ? `Anotamos ${vem === 1 ? "uma presença" : `${vem} presenças`}. Se mudar alguma coisa, é só voltar neste link.`
            : "Vamos sentir sua falta. Se mudar de ideia, volte neste link."}
        </p>
        <button
          className="btn btn--linha"
          style={{ marginTop: "2rem" }}
          onClick={() => setPronto(false)}
        >
          Mudar as respostas
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "2.5rem" }}>
      {convidados.map((c) => (
        <div className="pessoa" key={c.id}>
          {/* Com uma pessoa só, o nome já é o título da página — repeti-lo
              aqui não informa nada. */}
          {convidados.length > 1 && (
            <p className="pessoa__nome">
              {c.nome}
              {c.crianca && (
                <span style={{ opacity: 0.55, fontSize: ".85rem" }}> · criança</span>
              )}
            </p>
          )}
          <div className="pessoa__opcoes" role="group" aria-label={`${c.nome} vem?`}>
            <button
              className="escolha"
              aria-pressed={respostas[c.id] === "vem"}
              onClick={() => setRespostas((r) => ({ ...r, [c.id]: "vem" }))}
            >
              Vou
            </button>
            <button
              className="escolha"
              aria-pressed={respostas[c.id] === "nao_vem"}
              onClick={() => setRespostas((r) => ({ ...r, [c.id]: "nao_vem" }))}
            >
              Não vou
            </button>
          </div>
          {respostas[c.id] === "vem" && (
            <input
              className="restricao"
              placeholder="Alguma restrição alimentar? (opcional)"
              value={restricoes[c.id] ?? ""}
              onChange={(e) => setRestricoes((r) => ({ ...r, [c.id]: e.target.value }))}
            />
          )}
        </div>
      ))}

      {vem > 0 && (
        <label
          style={{
            display: "flex",
            gap: ".8rem",
            alignItems: "center",
            marginTop: "1.6rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={transporte}
            onChange={(e) => setTransporte(e.target.checked)}
            style={{ width: "1.15rem", height: "1.15rem", accentColor: "var(--luz)" }}
          />
          <span className="texto" style={{ margin: 0 }}>
            Preciso de carona da capela para o sítio
          </span>
        </label>
      )}

      {erro && (
        <p className="folha__erro" style={{ marginTop: "1.5rem" }}>
          {erro}
        </p>
      )}

      <button
        className="btn btn--claro"
        style={{ marginTop: "2rem" }}
        disabled={faltam > 0 || enviando}
        onClick={enviar}
      >
        {enviando
          ? "Salvando…"
          : faltam === 0
            ? "Confirmar"
            : convidados.length === 1
              ? "Escolha uma das duas"
              : `Falta responder por ${faltam}`}
      </button>
    </div>
  );
}
