import { db } from "@/lib/db";
import { juntarNomes } from "@/lib/nomes";

/** Um par pronto para virar peça: o código para achar, os nomes para imprimir. */
export type ParParaConvite = { codigo: string; nomes: string };

/**
 * Os pares de padrinhos com os nomes já juntos.
 *
 * Vive aqui porque as duas telas de convite — as doze peças juntas e a peça
 * de um par só — fazem a mesma pergunta ao banco, e a única diferença entre
 * elas é um `where`. Duas cópias da mesma consulta acabariam divergindo na
 * ordenação, e aí a folha 7 da impressão não seria mais o mesmo casal da
 * folha 7 de ontem.
 */
export async function paresParaConvite(codigo?: string): Promise<ParParaConvite[]> {
  const { rows } = await db.query<{ codigo: string; nomes: string[] }>(
    `select c.codigo, array_agg(g.nome order by g.nome) as nomes
       from convites c
       join convidados g on g.convite_id = c.id
      where c.tipo = 'padrinhos'
        and ($1::text is null or c.codigo = $1)
      group by c.id
      order by min(g.nome)`,
    [codigo ?? null],
  );

  return rows.map((r) => ({ codigo: r.codigo, nomes: juntarNomes(r.nomes) }));
}
