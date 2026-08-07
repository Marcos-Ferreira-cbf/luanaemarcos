import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Convite from "@/components/Convite";
import { temSessao } from "@/lib/admin";
import { script } from "@/lib/fontes";
import { paresParaConvite } from "@/lib/padrinhos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convite do par",
  robots: { index: false, follow: false },
};

/**
 * A peça de um par só, para salvar em PDF e mandar para o casal.
 *
 * Existe separada da tela com todas porque o uso é outro: lá se imprime as
 * doze de uma vez, aqui se pega uma. Imprimir a tela de todas e depois
 * recortar a folha 7 no PDF é o tipo de trabalho manual que a gente está
 * justamente tirando do caminho.
 *
 * O código fica na URL e nunca na peça. Ele é a chave da confirmação — quem
 * tem o código responde pelo casal — e este PDF nasce para ser mandado
 * adiante, encaminhado, às vezes postado.
 */
export default async function PaginaConvitePar({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  if (!(await temSessao())) redirect("/admin/entrar");

  const { codigo } = await params;
  const normalizado = decodeURIComponent(codigo).trim().toUpperCase().slice(0, 12);

  const [par] = await paresParaConvite(normalizado);
  if (!par) notFound();

  return (
    <main className="bloco bloco--escuro" style={{ minHeight: "100svh" }}>
      <div className="col">
        <Link
          href="/admin/padrinhos/convites"
          className="rotulo"
          style={{ textDecoration: "none" }}
        >
          ← Todos os convites
        </Link>

        <h1 className="titulo" style={{ marginTop: "2rem" }}>
          {par.nomes}
        </h1>
        <p className="texto">
          Imprimir ou salvar em PDF sai só esta peça, em A4. O código do convite não
          aparece nela de propósito — ele é a chave da confirmação, e esta arte vai
          ser encaminhada.
        </p>

        <div className={script.variable} style={{ marginTop: "2rem" }}>
          <Convite nome={par.nomes} modelo="padrinhos" />
        </div>
      </div>
    </main>
  );
}
