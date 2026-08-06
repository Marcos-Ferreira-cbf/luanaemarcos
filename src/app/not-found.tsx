import Link from "next/link";
import CodigoConvite from "@/components/CodigoConvite";

/**
 * A tela padrão do Next é preta com "This page could not be found" em inglês.
 * Quem cai aqui quase sempre é convidado com o código errado — a saída útil
 * é o campo do código, não um aviso técnico.
 */
export default function NaoEncontrado() {
  return (
    <main className="bloco bloco--escuro" style={{ minHeight: "100svh" }}>
      <div className="col">
        <Link href="/" className="rotulo" style={{ textDecoration: "none" }}>
          ← Marcos &amp; Luana
        </Link>

        <h1 className="titulo" style={{ marginTop: "2rem" }}>
          Não achamos essa página
        </h1>
        <p className="texto">
          Se você estava procurando o seu convite, o código tem seis letras e veio junto
          com o link no WhatsApp. Confira e tente de novo.
        </p>

        <div style={{ marginTop: "2.5rem" }}>
          <CodigoConvite />
        </div>
      </div>
    </main>
  );
}
