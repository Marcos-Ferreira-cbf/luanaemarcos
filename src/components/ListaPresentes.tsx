"use client";

import { reais } from "@/lib/formato";
import type { Presente } from "@/lib/tipos";
import { useAbrirPagamento } from "./pagamento";

/**
 * Uma lista de presentes. O "restam N" só aparece nas cotas — nos itens da
 * casa, que têm meta 1, mostrar "restam 1" só faria o convidado hesitar.
 */
export default function ListaPresentes({ presentes }: { presentes: Presente[] }) {
  const abrir = useAbrirPagamento();

  return (
    <div className="lista" style={{ marginTop: "1rem" }}>
      {presentes.map((p) => {
        const livre = p.tipo === "livre";
        const esgotado = p.cotas_restantes !== null && p.cotas_restantes <= 0;
        const mostrarResta = p.meta_cotas !== null && p.meta_cotas > 1;

        return (
          <button
            key={p.id}
            className="item"
            disabled={esgotado}
            onClick={() =>
              abrir({
                presenteId: p.id,
                nome: p.nome,
                valorUnitario: p.valor_centavos,
                cotas: 1,
                valorLivre: livre,
              })
            }
          >
            <span>
              <span className="item__nome">{p.nome}</span>
              {esgotado ? (
                <span className="item__resta">já presentearam</span>
              ) : (
                mostrarResta && (
                  <span className="item__resta">restam {p.cotas_restantes}</span>
                )
              )}
            </span>
            <span className="item__valor">
              {livre ? "você decide" : reais(p.valor_centavos)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
