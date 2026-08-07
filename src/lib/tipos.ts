/** O que a view v_presentes devolve, já do jeito que a interface consome. */
export type Presente = {
  id: string;
  slug: string;
  grupo: "casa" | "lua_de_mel" | "gravata";
  tipo: "produto" | "cota" | "gravata" | "livre";
  nome: string;
  descricao: string | null;
  valor_centavos: number;
  meta_cotas: number | null;
  meta_valor_centavos: number | null;
  ordem: number;
  /** null quando o presente nunca esgota (gravata e valor livre). */
  cotas_restantes: number | null;
  arrecadado_centavos: number;
};

export type Mare = {
  arrecadadoCentavos: number;
  metaCentavos: number;
  pessoas: number;
};

/* ---------------------------------------------------------------- painel */

/** Contadores do topo do painel. Vêm como string do pg (count é bigint). */
export type Resumo = {
  arrecadado_centavos: string;
  pagos: string;
  pendentes: string;
  a_agradecer: string;
  vem: string;
  nao_vem: string;
  sem_resposta: string;
  convites_a_enviar: string;
};

export type PedidoPago = {
  id: string;
  nome_pagador: string;
  whatsapp_pagador: string | null;
  mensagem: string | null;
  valor_centavos: number;
  pago_em: string;
  agradecido_em: string | null;
  presentes: string;
};

/** Um convite é uma pessoa: o nome vem do convidado, não do convite. */
export type ConviteResumo = {
  codigo: string;
  /** A pessoa, não o convite — é a linha que a correção de nome e número altera. */
  convidado_id: string;
  nome: string;
  status: "pendente" | "vem" | "nao_vem";
  crianca: boolean;
  /** E.164 sem o +. Null quando não há número cadastrado. */
  whatsapp: string | null;
  convite_enviado_em: string | null;
};

/** O que abre a folha de pagamento. */
export type Escolha = {
  presenteId: string;
  nome: string;
  /** Centavos por cota. No valor livre é 100 — uma cota é um real. */
  valorUnitario: number;
  cotas: number;
  /** No valor livre o convidado digita quanto quer dar. */
  valorLivre?: boolean;
};
