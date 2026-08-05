"use client";

import { useEffect, useRef } from "react";

/**
 * Revelação ao rolar. Um observer por elemento, que se desliga assim que
 * dispara — a animação é de entrada, não tem por que continuar escutando.
 *
 * Quem pediu prefers-reduced-motion já recebe tudo visível pelo CSS; aqui
 * o data-visivel só chega depois e não muda nada.
 */
export default function Surge({
  children,
  className = "",
  ...resto
}: React.ComponentProps<"div">) {
  const alvo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            el.dataset.visivel = "true";
            obs.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={alvo} className={`surge ${className}`.trim()} {...resto}>
      {children}
    </div>
  );
}
