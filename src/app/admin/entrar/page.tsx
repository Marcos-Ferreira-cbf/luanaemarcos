import { redirect } from "next/navigation";
import FormularioEntrar from "@/components/FormularioEntrar";
import { temSessao } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function PaginaEntrar() {
  if (await temSessao()) redirect("/admin");

  return (
    <main
      className="bloco bloco--escuro"
      style={{ minHeight: "100svh", display: "flex", alignItems: "center" }}
    >
      <div className="col">
        <p className="rotulo">Painel</p>
        <h1 className="titulo">Marcos &amp; Luana</h1>
        <FormularioEntrar />
      </div>
    </main>
  );
}
