import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = "https://api.mercadopago.com";

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("MP_ACCESS_TOKEN não configurado");
  return t;
}

export type PagamentoMp = {
  id: number;
  status: "pending" | "approved" | "authorized" | "in_process" | "rejected" | "cancelled" | "refunded";
  status_detail: string;
  transaction_amount: number;
  external_reference?: string;
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string };
  };
};

/**
 * Cria uma cobrança Pix. A chave de idempotência é o id do pedido: se a rota
 * for chamada duas vezes (clique duplo, retry de rede), o Mercado Pago
 * devolve o mesmo pagamento em vez de criar outro.
 */
export async function criarPagamentoPix(params: {
  pedidoId: string;
  valorCentavos: number;
  descricao: string;
  nome: string;
  email?: string;
  expiraEm: Date;
}): Promise<PagamentoMp> {
  const r = await fetch(`${BASE}/v1/payments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token()}`,
      "X-Idempotency-Key": params.pedidoId,
    },
    body: JSON.stringify({
      transaction_amount: params.valorCentavos / 100,
      payment_method_id: "pix",
      description: params.descricao,
      external_reference: params.pedidoId,
      date_of_expiration: params.expiraEm.toISOString(),
      payer: {
        email: params.email || "convidado@marcoseluana.social.br",
        first_name: params.nome.split(" ")[0],
      },
    }),
  });

  if (!r.ok) {
    throw new Error(`Mercado Pago recusou a cobrança (${r.status}): ${await r.text()}`);
  }
  return r.json();
}

/**
 * Invariante 5: o webhook do Mercado Pago manda só o ID. O status real
 * vem sempre daqui, nunca do corpo da notificação.
 */
export async function consultarPagamento(id: string | number): Promise<PagamentoMp> {
  const r = await fetch(`${BASE}/v1/payments/${id}`, {
    headers: { authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Falha ao consultar pagamento ${id} (${r.status})`);
  return r.json();
}

/**
 * Valida a assinatura do webhook.
 *
 * O manifesto é montado exatamente nesta ordem — id, request-id, ts — e
 * assinado com HMAC-SHA256 usando a chave secreta do painel. Sem isso,
 * qualquer um que descubra a URL marca um pedido como pago.
 */
export function assinaturaValida(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo || !params.xSignature || !params.dataId) return false;

  let ts = "";
  let v1 = "";
  for (const parte of params.xSignature.split(",")) {
    const [chave, valor] = parte.split("=").map((s) => s?.trim());
    if (chave === "ts") ts = valor ?? "";
    if (chave === "v1") v1 = valor ?? "";
  }
  if (!ts || !v1) return false;

  // O id entra em minúsculas quando é alfanumérico.
  const id = params.dataId.toLowerCase();
  const manifesto = `id:${id};request-id:${params.xRequestId ?? ""};ts:${ts};`;
  const esperado = createHmac("sha256", segredo).update(manifesto).digest("hex");

  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
