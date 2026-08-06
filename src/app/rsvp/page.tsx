import Link from "next/link";
import CodigoConvite from "@/components/CodigoConvite";

export const runtime = "nodejs";

/**
 * /rsvp sem código não é um erro do visitante — é gente que apagou o link,
 * digitou o endereço de cabeça ou cortou a URL sem querer. Devolver 404 aqui
 * dizia "some", quando a resposta certa é "digite o seu código".
 */
export default function PaginaCodigo() {
  return (
    <main className="bloco bloco--escuro" style={{ minHeight: "100svh" }}>
      <div className="col">
        <Link href="/" className="rotulo" style={{ textDecoration: "none" }}>
          ← Luana &amp; Marcos
        </Link>

        <h1 className="titulo" style={{ marginTop: "2rem" }}>
          Seu convite
        </h1>
        <p className="texto">
          O link completo chegou pelo WhatsApp. Se ele se perdeu, digite aqui o código de
          seis letras que veio junto.
        </p>

        <div style={{ marginTop: "2.5rem" }}>
          <CodigoConvite />
        </div>
      </div>
    </main>
  );
}
