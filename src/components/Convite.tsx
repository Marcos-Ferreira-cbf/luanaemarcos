"use client";

import { useState } from "react";

/**
 * O convite propriamente dito: uma peça para guardar, imprimir ou postar.
 *
 * É tipográfico de propósito, sem foto. Foto de fundo em convite impresso
 * come tinta, some no papel comum e briga com o texto por cima; e numa tela
 * de celular, o que carrega a emoção aqui é o nome da pessoa em serifa
 * grande, não mais uma imagem que ela já viu na capa do site.
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
      text: `Fui convidado para o casamento de Marcos e Luana!`,
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
        <p className="convite__alto">Com a bênção de Deus</p>

        <h1 className="convite__nomes">
          Marcos <em>&amp;</em> Luana
        </h1>

        <p className="convite__ornamento" aria-hidden="true" />

        <p className="convite__frase">têm a alegria de convidar</p>
        <p className="convite__convidado">{nome}</p>
        <p className="convite__frase">para a celebração do seu casamento</p>

        <p className="convite__ornamento" aria-hidden="true" />

        <p className="convite__data">
          Sábado, 10 de outubro de 2026
        </p>

        <div className="convite__onde">
          <p>
            <span className="convite__hora">09h30</span>
            Capela Nossa Senhora de Lourdes, a Santinha
          </p>
          <p>
            <span className="convite__hora">12h00</span>
            Almoço no Sítio Correa, Souzalândia
          </p>
        </div>

        <p className="convite__cidade">Barro Alto · Goiás</p>

        <p className="convite__verso">
          Portanto, o que Deus uniu, não o separe o homem.
          <span className="convite__ref">Marcos 10:9</span>
        </p>
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
