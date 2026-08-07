import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Convite from "@/components/Convite";
import { temSessao } from "@/lib/admin";
import { script } from "@/lib/fontes";
import { paresParaConvite } from "@/lib/padrinhos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convites dos padrinhos",
  robots: { index: false, follow: false },
};

/**
 * As peças de todos os pares, cada uma com os nomes do seu casal.
 *
 * Não são doze artes: é uma arte e doze pares no banco. Cadastrar um par novo
 * faz a peça dele aparecer aqui sozinha, e corrigir um nome na lista corrige
 * a peça — que é justamente o motivo de o nome nunca ter sido escrito dentro
 * do componente.
 *
 * A classe `comparar` é o que faz cada peça sair na sua folha ao imprimir;
 * sem ela as doze se empilham no canto 0,0 e a impressão vira uma página só
 * com tudo por cima de tudo. Assim um Ctrl+P só resolve as doze.
 */
export default async function PaginaConvitesPadrinhos() {
  if (!(await temSessao())) redirect("/admin/entrar");

  const pares = await paresParaConvite();

  return (
    <main className="bloco bloco--escuro comparar" style={{ minHeight: "100svh" }}>
      <div className="col">
        <Link href="/admin/padrinhos" className="rotulo" style={{ textDecoration: "none" }}>
          ← Padrinhos
        </Link>

        <h1 className="titulo" style={{ marginTop: "2rem" }}>
          Convites dos padrinhos
        </h1>
        <p className="texto">
          {pares.length === 0
            ? "Nenhum par cadastrado ainda — as peças aparecem aqui sozinhas conforme os pares entram na lista."
            : `${pares.length} peças, uma por casal. Imprimir daqui sai cada casal na sua folha. Para mandar uma só pelo WhatsApp, abra a peça do par e salve em PDF.`}
        </p>

        <div className={script.variable}>
          {pares.map((par) => (
            <section key={par.codigo} style={{ marginTop: "3.5rem" }}>
              <p className="rotulo">{par.nomes}</p>
              <Link
                href={`/admin/padrinhos/convites/${par.codigo}`}
                className="cartao__meta"
                style={{ display: "inline-block", marginBottom: "1.2rem" }}
              >
                abrir só esta
              </Link>
              <Convite nome={par.nomes} modelo="padrinhos" />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
