"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Foto = { arquivo: string; alt: string };

/** px por segundo. Devagar de propósito: é um ensaio, não um letreiro. */
const VELOCIDADE = 24;

/** Depois de mexer, a pessoa fica no comando por este tempo. */
const ESPERA = 5000;

/**
 * A galeria gira sozinha e não termina: a lista é renderizada duas vezes e o
 * rolamento volta ao meio quando passa da metade, então não existe "fim do
 * carrossel" para a pessoa esbarrar — importa porque a lista vai crescer
 * muito e ninguém rola trinta fotos com o dedo.
 *
 * Qualquer toque, hover, arrasto ou seta pausa o giro; ele volta sozinho
 * depois de alguns segundos parado. Quem prefere menos movimento no sistema
 * (prefers-reduced-motion) recebe a trilha estática e usa as setas.
 */
export default function Galeria({ fotos }: { fotos: Foto[] }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [pausado, setPausado] = useState(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pausa agora e agenda a volta. Chamado por hover, foco, toque e setas.
  const segurar = useCallback(() => {
    setPausado(true);
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setPausado(false), ESPERA);
  }, []);

  const soltar = useCallback(() => {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setPausado(false), 600);
  }, []);

  useEffect(() => () => void (relogio.current && clearTimeout(relogio.current)), []);

  useEffect(() => {
    const el = trilho.current;
    if (!el || pausado) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let anterior = 0;
    let id = 0;

    const passo = (agora: number) => {
      if (anterior) {
        // Limitar o delta evita um salto feio quando a aba volta do fundo.
        const dt = Math.min(agora - anterior, 50);
        el.scrollLeft += (VELOCIDADE * dt) / 1000;
        const meio = el.scrollWidth / 2;
        if (meio > 0 && el.scrollLeft >= meio) el.scrollLeft -= meio;
      }
      anterior = agora;
      id = requestAnimationFrame(passo);
    };

    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [pausado]);

  // Voltar antes do início — pela seta ou pelo dedo — cai no fim da primeira
  // cópia, que é visualmente o mesmo lugar.
  function aoRolar() {
    const el = trilho.current;
    if (!el) return;
    const meio = el.scrollWidth / 2;
    if (meio > 0 && el.scrollLeft <= 0) el.scrollLeft += meio;
  }

  function andar(direcao: 1 | -1) {
    const el = trilho.current;
    if (!el) return;
    const item = el.firstElementChild as HTMLElement | null;
    const largura = item ? item.offsetWidth + 10 : el.clientWidth * 0.8;
    segurar();
    el.scrollBy({ left: direcao * largura, behavior: "smooth" });
  }

  // A segunda cópia é decoração: para quem usa leitor de tela, a galeria tem
  // o número de fotos que ela realmente tem.
  const duplicado = [...fotos, ...fotos];

  return (
    <div className="galeria">
      <div
        className="rail galeria__trilho"
        ref={trilho}
        onScroll={aoRolar}
        onPointerEnter={segurar}
        onPointerLeave={soltar}
        onPointerDown={segurar}
        onTouchStart={segurar}
        onFocusCapture={segurar}
        onBlurCapture={soltar}
      >
        {duplicado.map((f, i) => (
          <div
            className="rail__item"
            key={`${f.arquivo}-${i}`}
            aria-hidden={i >= fotos.length ? true : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/fotos/${f.arquivo}`}
              alt={i >= fotos.length ? "" : f.alt}
              loading={i < 3 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>

      <div className="galeria__setas">
        <button
          type="button"
          className="galeria__seta"
          aria-label="Foto anterior"
          onClick={() => andar(-1)}
        >
          ←
        </button>
        <button
          type="button"
          className="galeria__seta"
          aria-label="Próxima foto"
          onClick={() => andar(1)}
        >
          →
        </button>
      </div>
    </div>
  );
}
