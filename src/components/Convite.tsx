"use client";

import { useState } from "react";
import Folhagem from "./Folhagem";

/**
 * O convite propriamente dito: uma peça para guardar, imprimir ou postar.
 *
 * Proporção de A4 em pé, folhagem em dois cantos opostos, nomes em
 * caligrafia e a faixa da data em três campos — é o convite de casamento
 * que todo mundo reconhece, e reconhecer é metade do trabalho aqui.
 *
 * O versículo ficou de fora: dentro de uma A4 ele empurrava o endereço para
 * cima da folhagem, e ele já abre a página inicial. Convite de papel diz
 * quem, quando e onde — o resto é o site.
 *
 * O código do convite NÃO aparece na peça. Ele é a chave da confirmação —
 * quem tem o código responde pelo convidado. Um convite feito para ser
 * postado no Instagram não pode carregar a chave de ninguém.
 */
export default function Convite({ nome }: { nome: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartilhar() {
    const dados = {
      title: "Marcos & Luana · 10.10.2026",
      text: "Fui convidado para o casamento de Marcos e Luana!",
      url: "https://marcoseluana.social.br",
    };

    // O share nativo abre a folha do sistema — WhatsApp, Instagram, o que a
    // pessoa tiver. No desktop quase nunca existe, e aí copiar o link é o
    // que sobra de útil.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(dados);
        return;
      } catch {
        // cancelou a folha de compartilhamento; não é erro
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(dados.url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <>
      <article className="convite" aria-label={`Convite de casamento para ${nome}`}>
        <Folhagem canto="cima" />
        <Folhagem canto="baixo" />

        <div className="convite__miolo">
          <h1 className="convite__nomes">
            <span>Marcos</span>
            <span className="convite__e">&amp;</span>
            <span>Luana</span>
          </h1>

          <p className="convite__chamada">
            Venha celebrar conosco
            <br />
            esse dia especial!
          </p>

          {/* O nome do convidado é o que faz esta peça ser dela e não de um
              modelo — por isso vem em serifa, sem caligrafia, para ler bem
              inclusive num nome comprido. */}
          <p className="convite__para">
            <span className="convite__paraRotulo">Convidamos</span>
            {nome}
          </p>

          <p className="convite__fio" aria-hidden="true" />

          <div className="convite__faixa">
            <span className="convite__faixaLado">Sábado</span>
            <span className="convite__faixaMeio">
              <em>10</em>
              <strong>OUT</strong>
              <em>2026</em>
            </span>
            <span className="convite__faixaLado">Às 09:30</span>
          </div>

          <div className="convite__local">
            <p>Capela Nossa Senhora de Lourdes, a Santinha</p>
            <p>Almoço ao meio-dia no Sítio Correa, Souzalândia</p>
            <p className="convite__cidade">Barro Alto · Goiás</p>
          </div>
        </div>
      </article>

      <div className="convite__acoes">
        <button className="btn btn--linha" onClick={() => window.print()}>
          Imprimir ou salvar em PDF
        </button>
        <button className="btn btn--linha" onClick={compartilhar}>
          {copiado ? "Link copiado" : "Compartilhar"}
        </button>
      </div>
    </>
  );
}
