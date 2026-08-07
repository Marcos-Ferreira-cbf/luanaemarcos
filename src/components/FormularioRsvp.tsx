"use client";

import { useState } from "react";
import { juntarNomes } from "@/lib/nomes";

type Convidado = {
  id: string;
  nome: string;
  crianca: boolean;
  status: "pendente" | "vem" | "nao_vem";
};

/**
 * O nome já vem do banco: ninguém digita quem é. O convidado só toca em
 * "Vou" ou "Não vou" — um toque, e acabou.
 *
 * O convite individual traz uma pessoa; o de padrinhos traz o casal. Aí cada
 * um responde o seu — um pode aceitar e o outro não poder, e o casal precisa
 * saber disso separado.
 *
 * Cada resposta vale sozinha. Já foi o contrário — o botão só ligava com o
 * convite inteiro respondido, para o casal não confundir silêncio com "não
 * vem". Só que o link do par cai no WhatsApp de uma pessoa, que responde
 * sozinha: a Sara tocou em "Aceito", o botão continuou morto dizendo "falta
 * responder por 1", e ela saiu achando que tinha confirmado. Perder a
 * resposta é muito pior do que recebê-la pela metade — quem falta continua
 * pendente no painel, que é exatamente a informação que se queria proteger.
 *
 * Já teve pergunta de carona e de restrição alimentar aqui. As duas saíram: a
 * tela existe para uma pergunta só — você vem? — e cada campo a mais é uma
 * chance de a pessoa fechar sem responder nenhuma. Restrição e carona se
 * resolvem conversando, e o casal vai falar com todo mundo de qualquer jeito.
 */
export default function FormularioRsvp({
  codigo,
  convidados,
  padrinhos = false,
}: {
  codigo: string;
  convidados: Convidado[];
  padrinhos?: boolean;
}) {
  const [respostas, setRespostas] = useState<Record<string, "vem" | "nao_vem">>(() =>
    Object.fromEntries(
      convidados
        .filter((c) => c.status !== "pendente")
        .map((c) => [c.id, c.status as "vem" | "nao_vem"]),
    ),
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  const respondidas = convidados.filter((c) => respostas[c.id]);
  const faltantes = convidados.filter((c) => !respostas[c.id]);
  const vem = respondidas.filter((c) => respostas[c.id] === "vem").length;

  async function enviar() {
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/rsvp/${encodeURIComponent(codigo)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // Só quem respondeu. Mandar o outro com status vazio faria a API
          // devolver "status inválido" e derrubaria a resposta boa junto.
          respostas: respondidas.map((c) => ({ id: c.id, status: respostas[c.id] })),
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
          {vem === 0
            ? "Obrigado por avisar."
            : padrinhos
              ? "Que alegria. Obrigado!"
              : "Que bom. Até lá."}
        </p>
        <p className="texto">
          {vem === 0
            ? "Vamos sentir sua falta. Se mudar de ideia, volte neste link."
            : padrinhos
              ? "Já estamos comemorando aqui. A gente combina o resto pessoalmente — e se mudar alguma coisa, é só voltar neste link."
              : `Anotamos ${vem === 1 ? "uma presença" : `${vem} presenças`}. Se mudar alguma coisa, é só voltar neste link.`}
        </p>
        {/* Quem falta fica dito por nome. Sem isso, quem respondeu sozinho sai
            da tela achando que respondeu pelos dois. */}
        {faltantes.length > 0 && (
          <p className="texto">
            {`Falta ${juntarNomes(faltantes.map((c) => c.nome))} — ${
              faltantes.length === 1 ? "é só abrir" : "é só abrirem"
            } este mesmo link e responder.`}
          </p>
        )}
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
          <div
            className="pessoa__opcoes"
            role="group"
            aria-label={padrinhos ? `${c.nome} aceita?` : `${c.nome} vem?`}
          >
            <button
              className="escolha"
              aria-pressed={respostas[c.id] === "vem"}
              onClick={() => setRespostas((r) => ({ ...r, [c.id]: "vem" }))}
            >
              {padrinhos ? "Aceito" : "Vou"}
            </button>
            <button
              className="escolha"
              aria-pressed={respostas[c.id] === "nao_vem"}
              onClick={() => setRespostas((r) => ({ ...r, [c.id]: "nao_vem" }))}
            >
              {padrinhos ? "Não vou poder" : "Não vou"}
            </button>
          </div>
        </div>
      ))}

      {erro && (
        <p className="folha__erro" style={{ marginTop: "1.5rem" }}>
          {erro}
        </p>
      )}

      <button
        className="btn btn--claro"
        style={{ marginTop: "2rem" }}
        disabled={respondidas.length === 0 || enviando}
        onClick={enviar}
      >
        {enviando
          ? "Salvando…"
          : respondidas.length === 0
            ? convidados.length === 1
              ? "Escolha uma das duas"
              : "Toque na sua resposta"
            : faltantes.length === 0
              ? "Confirmar"
              : "Confirmar minha resposta"}
      </button>
      {/* Dito antes de tocar, não depois: quem responde sozinho precisa saber
          que está gravando só a sua parte. */}
      {faltantes.length > 0 && respondidas.length > 0 && (
        <p className="texto" style={{ marginTop: ".75rem", opacity: 0.7 }}>
          {`${juntarNomes(faltantes.map((c) => c.nome))} pode responder depois, neste mesmo link.`}
        </p>
      )}
    </div>
  );
}
