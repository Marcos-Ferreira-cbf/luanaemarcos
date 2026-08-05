import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** As duas listas e a maré da gravata, numa chamada só. */
export async function GET() {
  const [presentes, gravata] = await Promise.all([
    db.query("select * from v_presentes"),
    db.query("select * from v_gravata"),
  ]);

  return NextResponse.json({
    casa: presentes.rows.filter((p) => p.grupo === "casa"),
    luaDeMel: presentes.rows.filter((p) => p.grupo === "lua_de_mel"),
    gravata: {
      cotas: presentes.rows.filter((p) => p.grupo === "gravata"),
      arrecadadoCentavos: Number(gravata.rows[0]?.arrecadado_centavos ?? 0),
      metaCentavos: Number(gravata.rows[0]?.meta_centavos ?? 350000),
      pessoas: Number(gravata.rows[0]?.pessoas ?? 0),
    },
  });
}
