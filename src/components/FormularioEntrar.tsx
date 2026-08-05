"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FormularioEntrar() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErro(null);
    try {
      const r = await fetch("/api/admin/entrar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!r.ok) {
        setErro("Senha incorreta.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setErro("Sem conexão.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <form onSubmit={entrar} style={{ marginTop: "2rem" }}>
      <label htmlFor="senha" className="rotulo" style={{ display: "block", marginBottom: ".6rem" }}>
        Senha
      </label>
      <input
        id="senha"
        type="password"
        className="campo"
        style={{ letterSpacing: ".15em", fontSize: "1.1rem" }}
        autoComplete="current-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />
      {erro && <p className="folha__erro">{erro}</p>}
      <button className="btn btn--claro" type="submit" disabled={!senha || entrando}>
        {entrando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
