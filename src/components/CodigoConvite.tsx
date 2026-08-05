"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * O convite chega pelo WhatsApp já com o link pronto. Este campo é a saída
 * para quem perdeu a mensagem — por isso aceita o código digitado de
 * qualquer jeito e normaliza antes de navegar.
 */
export default function CodigoConvite() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");

  function ir(e: React.FormEvent) {
    e.preventDefault();
    const limpo = codigo.trim().toUpperCase();
    if (limpo.length < 4) return;
    router.push(`/rsvp/${encodeURIComponent(limpo)}`);
  }

  return (
    <form onSubmit={ir}>
      <label htmlFor="codigo" className="rotulo" style={{ display: "block", marginBottom: ".6rem" }}>
        Código do convite
      </label>
      <input
        id="codigo"
        className="campo"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        placeholder="AB7K2P"
        maxLength={6}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
      />
      <button className="btn btn--claro" type="submit" disabled={codigo.trim().length < 4}>
        Ver meu convite
      </button>
    </form>
  );
}
