"use client";

import { useState } from "react";
import Folhagem from "./Folhagem";

export type ModeloConvite = "folhagem" | "faixa" | "retrato";

/** Um lugar só para o que muda se a festa mudar de hora ou de endereço. */
const FESTA = {
  dia: "10",
  mes: "OUT",
  ano: "2026",
  semana: "Sábado",
  hora: "09:30",
  capela: "Capela Nossa Senhora de Lourdes, a Santinha",
  almoco: "Almoço ao meio-dia no Sítio Correa, Souzalândia",
  cidade: "Barro Alto · Goiás",
};

/**
 * O convite propriamente dito: uma peça para guardar, imprimir ou postar.
 *
 * São três modelos com o mesmo conteúdo — quem, quando, onde — e três roupas
 * diferentes. Trocar o `modelo` troca a peça inteira sem mexer em nada em
 * volta, então dá para decidir depois e mudar de ideia sem custo.
 *
 * O versículo ficou de fora dos três: dentro de uma A4 ele empurrava o
 * endereço para cima do desenho, e ele já abre a página inicial. Convite de
 * papel diz quem, quando e onde — o resto é o site.
 *
 * O código do convite NÃO aparece em peça nenhuma. Ele é a chave da
 * confirmação — quem tem o código responde pelo convidado. Um convite feito
 * para ser postado no Instagram não pode carregar a chave de ninguém.
 */
export default function Convite({
  nome,
  modelo = "folhagem",
}: {
  nome: string;
  modelo?: ModeloConvite;
}) {
  const [copiado, setCopiado] = useState(false);

  async function compartilhar() {
    const dados = {
      title: "Luana & Marcos · 10.10.2026",
      text: "Fui convidado para o casamento de Luana e Marcos!",
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
      {modelo === "faixa" ? (
        <PecaFaixa nome={nome} />
      ) : modelo === "retrato" ? (
        <PecaRetrato nome={nome} />
      ) : (
        <PecaFolhagem nome={nome} />
      )}

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

/* ---------- modelo 1: folhagem ---------- */

/**
 * Proporção de A4 em pé, folhagem em dois cantos opostos, nomes em
 * caligrafia e a faixa da data em três campos — é o convite de casamento
 * que todo mundo reconhece, e reconhecer é metade do trabalho aqui.
 */
function PecaFolhagem({ nome }: { nome: string }) {
  return (
    <article className="convite" aria-label={`Convite de casamento para ${nome}`}>
      <Folhagem canto="cima" />
      <Folhagem canto="baixo" />

      <div className="convite__miolo">
        <h1 className="convite__nomes">
          <span>Luana</span>
          <span className="convite__e">&amp;</span>
          <span>Marcos</span>
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
          <span className="convite__faixaLado">{FESTA.semana}</span>
          <span className="convite__faixaMeio">
            <em>{FESTA.dia}</em>
            <strong>{FESTA.mes}</strong>
            <em>{FESTA.ano}</em>
          </span>
          <span className="convite__faixaLado">Às {FESTA.hora}</span>
        </div>

        <div className="convite__local">
          <p>{FESTA.capela}</p>
          <p>{FESTA.almoco}</p>
          <p className="convite__cidade">{FESTA.cidade}</p>
        </div>
      </div>
    </article>
  );
}

/* ---------- modelo 2: faixa de fotos ---------- */

/** Três fotos de recortes bem diferentes: um plano aberto, um abraço e um
 *  rosto. Lado a lado em tiras estreitas, variar o enquadramento é o que
 *  impede a faixa de virar três vezes a mesma imagem. */
const TIRA = [
  { arquivo: "foto-04.webp", alt: "Luana e Marcos na praia" },
  { arquivo: "foto-08.webp", alt: "Os dois caminhando de mãos dadas" },
  { arquivo: "foto-06.webp", alt: "Luana sorrindo abraçada a Marcos" },
];

/**
 * A data em números gigantes vazados por cima das fotos. O preto e branco
 * quente é filtro de CSS, não edição: qualquer foto que entre aqui já chega
 * combinando com as outras duas, sem passar pelo Photoshop antes.
 */
function PecaRetratoNumeros() {
  return (
    <div className="faixa__numeros" aria-hidden="true">
      <span>10</span>
      <span>10</span>
      <span>26</span>
    </div>
  );
}

function PecaFaixa({ nome }: { nome: string }) {
  return (
    <article
      className="convite convite--faixa"
      aria-label={`Convite de casamento para ${nome}`}
    >
      <div className="faixa__tira">
        {TIRA.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f.arquivo} src={`/fotos/${f.arquivo}`} alt={f.alt} loading="lazy" />
        ))}
        <PecaRetratoNumeros />
      </div>

      <h1 className="faixa__nomes">
        Luana <em>&amp;</em> Marcos
      </h1>

      <p className="faixa__convidam">convidam para seu casamento</p>

      <p className="faixa__para">
        <span className="faixa__paraRotulo">Convidamos</span>
        {nome}
      </p>

      <p className="faixa__hora">
        Às <strong>{FESTA.hora}</strong> horas
      </p>

      <div className="faixa__local">
        <p>{FESTA.capela}</p>
        <p>{FESTA.almoco}</p>
        <p className="faixa__cidade">{FESTA.cidade}</p>
      </div>
    </article>
  );
}

/* ---------- modelo 3: salve a data ---------- */

/**
 * Uma foto grande no alto e tipografia sóbria embaixo: os nomes em caixa
 * alta com serifa, a data numa caixinha e o endereço em letras miúdas.
 * É o modelo que menos depende de desenho e mais depende da foto — se a foto
 * for boa, esse é o mais bonito dos três impresso.
 */
function PecaRetrato({ nome }: { nome: string }) {
  return (
    <article
      className="convite convite--retrato"
      aria-label={`Convite de casamento para ${nome}`}
    >
      <div className="retrato__foto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fotos/foto-03.webp"
          alt="Luana e Marcos frente a frente na praia"
          loading="lazy"
        />
      </div>

      <p className="retrato__salve">• salve a data •</p>

      <p className="retrato__texto">
        Com a bênção de Deus e de nossas famílias,
        <br />
        convidamos <strong>{nome}</strong> para celebrar conosco
        <br />o nosso casamento.
      </p>

      <h1 className="retrato__nomes">
        <span className="retrato__fleuron" aria-hidden="true" />
        Luana &amp; Marcos
        <span className="retrato__fleuron" aria-hidden="true" />
      </h1>

      <p className="retrato__data">
        {FESTA.dia} {FESTA.mes} <span aria-hidden="true">•</span> ÀS{" "}
        {FESTA.hora.replace(":", "H")}
      </p>

      <div className="retrato__local">
        <p>{FESTA.capela}</p>
        <p>{FESTA.almoco}</p>
        <p>{FESTA.cidade}</p>
      </div>
    </article>
  );
}
