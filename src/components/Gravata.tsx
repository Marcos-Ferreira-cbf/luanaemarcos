"use client";

import { useEffect, useRef, useState } from "react";
import { reais } from "@/lib/formato";
import type { Mare, Presente } from "@/lib/tipos";
import { useAbrirPagamento } from "./pagamento";

/**
 * A maré. É a única animação da página com significado: a barra sobe até o
 * que já foi arrecadado e trava em 100%, mesmo quando a meta é ultrapassada
 * — daí em diante quem conta a história é o texto, não a régua.
 */
export default function Gravata({ cotas, mare }: { cotas: Presente[]; mare: Mare }) {
  const abrir = useAbrirPagamento();
  const secao = useRef<HTMLElement>(null);
  const [largura, setLargura] = useState("0%");

  // A do meio vem marcada, como no protótipo: é a cota que a maioria escolhe
  // e poupa um toque de quem não quer pensar no valor.
  const [escolhida, setEscolhida] = useState(
    () => cotas[Math.floor(cotas.length / 2)] ?? cotas[0],
  );

  const progresso = Math.min(mare.arrecadadoCentavos / mare.metaCentavos, 1);
  const passou = mare.arrecadadoCentavos > mare.metaCentavos;

  useEffect(() => {
    const el = secao.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            setLargura(`${progresso * 100}%`);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [progresso]);

  return (
    <section className="bloco bloco--escuro gravata" id="gravata" ref={secao}>
      <div className="gravata__fundo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/fotos/foto-03.webp" alt="" />
      </div>
      <div className="gravata__conteudo col surge" data-visivel="true">
        <p className="rotulo">A gravata</p>
        <h2 className="titulo">Na festa ela vai a leilão. Aqui, começa antes.</h2>
        <p className="texto">
          Cada cota faz a maré subir um pouco. A meta é três mil e quinhentos — e se
          passar, melhor ainda: o que vier a mais vira dia extra na Lapônia.
        </p>

        <div className="mare">
          <p className="mare__num">{reais(mare.arrecadadoCentavos)}</p>
          <p className="mare__de">
            {passou
              ? `meta de ${reais(mare.metaCentavos)} batida — obrigado`
              : `de ${reais(mare.metaCentavos)} · ${mare.pessoas} ${
                  mare.pessoas === 1 ? "pessoa já entrou" : "pessoas já entraram"
                }`}
          </p>
          <div className="mare__trilho">
            <div className="mare__nivel" style={{ width: largura }} />
          </div>
        </div>

        <div className="cotas" role="group" aria-label="Valor da cota">
          {cotas.map((c) => (
            <button
              key={c.id}
              className="cota"
              aria-pressed={escolhida?.id === c.id}
              onClick={() => setEscolhida(c)}
            >
              {reais(c.valor_centavos)}
            </button>
          ))}
        </div>

        <button
          className="btn btn--claro"
          disabled={!escolhida}
          onClick={() =>
            escolhida &&
            abrir({
              presenteId: escolhida.id,
              nome: "Cota da gravata",
              valorUnitario: escolhida.valor_centavos,
              cotas: 1,
            })
          }
        >
          Entrar na gravata
        </button>
      </div>
    </section>
  );
}
