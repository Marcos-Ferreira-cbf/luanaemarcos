"use client";

import { useEffect, useState } from "react";

const CERIMONIA = new Date("2026-10-10T09:30:00-03:00").getTime();

/**
 * Quantos dias faltam.
 *
 * Calculado só depois de montar, de propósito: o servidor roda em UTC e o
 * convidado no fuso de Brasília. Renderizar no servidor daria divergência de
 * hidratação perto da virada do dia, e o ganho seria um traço a menos por
 * alguns milissegundos.
 */
export default function Contagem() {
  const [texto, setTexto] = useState("—");

  useEffect(() => {
    const dias = Math.max(0, Math.ceil((CERIMONIA - Date.now()) / 86_400_000));
    setTexto(dias === 0 ? "é hoje" : `faltam ${dias} dias`);
  }, []);

  return (
    <p className="capa__falta" suppressHydrationWarning>
      {texto}
    </p>
  );
}
