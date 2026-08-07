"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Um pedaço de texto que vira campo quando se clica nele.
 *
 * A alternativa seria uma tela de edição separada, e ela erra o uso real: a
 * Luana descobre o número errado *olhando a lista*, no meio de mandar os
 * convites, e não vai navegar para outro lugar e voltar. O conserto tem que
 * acontecer onde o erro apareceu.
 *
 * Salva ao sair do campo, não só no Enter. Quem clica num texto para
 * corrigir não pensa em "confirmar" — pensa que já corrigiu, e clica na
 * próxima coisa. Exigir Enter perderia a edição em silêncio, que é o pior
 * desfecho possível para uma tela de conferência.
 *
 * Só chama o servidor se o valor mudou de fato: abrir e fechar sem mexer não
 * é uma alteração, e não deve gastar uma escrita nem piscar "salvo".
 */
export default function CampoEditavel({
  bruto,
  exibido,
  vazio,
  rotulo,
  tipo = "text",
  aoSalvar,
}: {
  /** O valor como o servidor guarda — é ele que vai para o campo. */
  bruto: string | null;
  /** O valor como a pessoa lê. No telefone é a versão com DDD e traço. */
  exibido: string | null;
  /** O que mostrar quando não há valor. Clicável do mesmo jeito. */
  vazio: string;
  rotulo: string;
  tipo?: "text" | "tel";
  /** Devolve a mensagem de erro, ou null se deu certo. */
  aoSalvar: (novo: string) => Promise<string | null>;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) campo.current?.select();
  }, [editando]);

  function abrir() {
    setTexto(bruto ?? "");
    setErro(null);
    setEditando(true);
  }

  async function confirmar() {
    const novo = texto.trim();
    if (novo === (bruto ?? "").trim()) {
      setEditando(false);
      setErro(null);
      return;
    }
    setSalvando(true);
    const problema = await aoSalvar(novo);
    setSalvando(false);
    // Erro mantém o campo aberto com o que foi digitado: fechar aqui
    // devolveria o valor antigo e daria a impressão de que salvou.
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEditando(false);
  }

  if (!editando) {
    return (
      <button className="editavel" onClick={abrir} title={`Clique para editar — ${rotulo}`}>
        {exibido || <span className="editavel--vazio">{vazio}</span>}
      </button>
    );
  }

  return (
    <span className="editavel__campo">
      <input
        ref={campo}
        className="par__campo"
        aria-label={rotulo}
        inputMode={tipo === "tel" ? "tel" : "text"}
        disabled={salvando}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirmar();
          }
          if (e.key === "Escape") {
            setEditando(false);
            setErro(null);
          }
        }}
      />
      {erro && <span className="editavel__erro">{erro}</span>}
    </span>
  );
}
