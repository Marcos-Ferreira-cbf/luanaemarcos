-- =====================================================================
-- Casamento Luana e Marcos — schema
--
-- As seis invariantes de pagamento do ESTRUTURA.md são impostas aqui,
-- não no código da aplicação:
--
--   1. Preço nunca vem do cliente  -> reservar_cotas() lê valor_centavos
--   2. Reserva de cota é atômica   -> UPDATE ... RETURNING + check constraint
--   3. Toda reserva tem prazo      -> pedidos.expira_em + expirar_pedidos()
--   4. Webhook idempotente         -> unique (psp, evento_id)
--   5. Webhook manda só o ID       -> tratado no handler
--   6. Webhook não é fonte única   -> cron chama conciliar_pendentes()
--
-- psql "$DATABASE_URL" -f db/schema.sql
-- =====================================================================

-- gen_random_uuid() é nativa desde o Postgres 13, sem extensão nenhuma.
-- O Azure não permite pgcrypto no allow-list padrão, e aqui não faz falta.

-- ---------------------------------------------------------------------
-- Convites
--
-- O código é o que separa convidado de curioso. **Um convite por pessoa**:
-- cada convidado tem o seu código, o seu link e o seu número de WhatsApp.
-- Um casal recebe dois links, um cada.
--
-- Por isso o convite não guarda nome nenhum — quem tem nome é o convidado,
-- na tabela abaixo, e todo convite tem exatamente um. Guardar o nome nos
-- dois lugares seria duas versões da mesma verdade, e uma delas ficaria
-- desatualizada na primeira correção de grafia.
-- ---------------------------------------------------------------------
create table if not exists convites (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text not null unique,
  whatsapp              text,
  convite_enviado_em    timestamptz,
  precisa_transporte    boolean not null default false,
  observacao            text,
  criado_em             timestamptz not null default now()
);

-- O número e a marca de "convite entregue" chegaram depois, com a aba
-- Convites do painel. Mesma regra do resto do arquivo: coluna nova entra por
-- alter, uma por linha, para o schema seguir aplicável em banco vazio e em
-- banco em produção.
--
-- whatsapp em E.164 sem o +, igual a pedidos.whatsapp_pagador: 5562996325652.
-- É o formato que o wa.me aceita direto, sem tratamento no cliente.
alter table convites add column if not exists whatsapp           text;
alter table convites add column if not exists convite_enviado_em timestamptz;

-- Padrinhos são a exceção à regra do convite individual, e a exceção é o
-- ponto: o convite de padrinho é um pedido, não um aviso, e um pedido se faz
-- ao casal junto. Um convite tipo='padrinhos' tem dois convidados e um link
-- só — cada um responde o seu "aceito", mas os dois leem o mesmo pedido.
alter table convites add column if not exists tipo text not null default 'individual';
alter table convites drop constraint if exists convites_tipo_check;
alter table convites add constraint convites_tipo_check
  check (tipo in ('individual', 'padrinhos'));

-- Sobras do modelo por família, que morreu quando o convite virou individual.
-- As duas tabelas estavam vazias, então isto não é migração — é limpeza.
alter table convites drop column if exists familia;
alter table convites drop column if exists limite_acompanhantes;

-- A fila de envio do convite, espelhando idx_pedidos_a_agradecer.
create index if not exists idx_convites_a_enviar on convites (criado_em)
  where convite_enviado_em is null;

create table if not exists convidados (
  id                  uuid primary key default gen_random_uuid(),
  convite_id          uuid not null references convites(id) on delete cascade,
  nome                text not null,
  crianca             boolean not null default false,
  idade               integer check (idade between 0 and 120),
  status              text not null default 'pendente'
                      check (status in ('pendente', 'vem', 'nao_vem')),
  restricao_alimentar text,
  respondido_em       timestamptz
);

-- O número por pessoa existe por causa dos padrinhos: o link é um só, do
-- casal, mas ele é mandado para os dois celulares. Em convite individual
-- fica null e vale o número do convite, que é o mesmo do convidado.
alter table convidados add column if not exists whatsapp text;

create index if not exists idx_convidados_convite on convidados (convite_id);
create index if not exists idx_convidados_status  on convidados (status);

-- ---------------------------------------------------------------------
-- Presentes
--
-- A gravata é só um presente com tipo='gravata': mesmo motor de cotas,
-- mesma conciliação. Não existe código separado para ela.
--
-- meta_cotas em null significa "nunca esgota" — é o caso da gravata e do
-- valor livre. A meta da gravata vive em meta_valor_centavos e só alimenta
-- a barra de progresso, que trava visualmente em 100% enquanto a
-- arrecadação continua subindo.
-- ---------------------------------------------------------------------
create table if not exists presentes (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  grupo                text not null check (grupo in ('casa', 'lua_de_mel', 'gravata')),
  tipo                 text not null check (tipo in ('produto', 'cota', 'gravata', 'livre')),
  nome                 text not null,
  descricao            text,
  valor_centavos       integer not null check (valor_centavos > 0),
  meta_cotas           integer check (meta_cotas > 0),
  cotas_reservadas     integer not null default 0 check (cotas_reservadas >= 0),
  cotas_vendidas       integer not null default 0 check (cotas_vendidas >= 0),
  meta_valor_centavos  integer check (meta_valor_centavos > 0),
  ordem                integer not null default 0,
  ativo                boolean not null default true,

  -- A trava da invariante 2: quem disputar a última cota e perder cai aqui,
  -- dentro da mesma transação, e não recebe um pedido pendente fantasma.
  constraint cotas_dentro_da_meta check (
    meta_cotas is null or cotas_reservadas + cotas_vendidas <= meta_cotas
  )
);

create index if not exists idx_presentes_grupo on presentes (grupo, ordem);

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
create table if not exists pedidos (
  id                uuid primary key default gen_random_uuid(),
  status            text not null default 'pendente'
                    check (status in ('pendente', 'pago', 'expirado', 'cancelado')),
  valor_centavos    integer not null check (valor_centavos > 0),
  metodo            text check (metodo in ('pix', 'cartao')),

  nome_pagador      text not null,
  email_pagador     text,
  -- E.164 sem o +, sempre: 5562996325652. É por aqui que sai o agradecimento.
  whatsapp_pagador  text,
  mensagem          text,

  psp               text not null default 'mercadopago',
  psp_pagamento_id  text,
  pix_qr_base64     text,
  pix_copia_e_cola  text,

  -- Invariante 3: sem prazo, um Pix abandonado prende a cota para sempre.
  expira_em         timestamptz not null default now() + interval '30 minutes',
  criado_em         timestamptz not null default now(),
  pago_em           timestamptz,

  constraint pagamento_unico_por_psp unique (psp, psp_pagamento_id)
);

-- create table if not exists não mexe em tabela que já existe. Colunas novas
-- entram aqui, uma linha por coluna, para o schema seguir aplicável em banco
-- vazio e em banco em produção.
alter table pedidos add column if not exists whatsapp_pagador text;
alter table pedidos add column if not exists agradecido_em    timestamptz;

create index if not exists idx_pedidos_status on pedidos (status);

-- Quem pagou e ainda não recebeu o obrigado. É a fila do agradecimento.
create index if not exists idx_pedidos_a_agradecer on pedidos (pago_em)
  where status = 'pago' and agradecido_em is null;
create index if not exists idx_pedidos_pendentes on pedidos (expira_em)
  where status = 'pendente';

create table if not exists pedido_itens (
  id                       uuid primary key default gen_random_uuid(),
  pedido_id                uuid not null references pedidos(id) on delete cascade,
  presente_id              uuid not null references presentes(id),
  cotas                    integer not null check (cotas > 0),
  -- Congelado no momento da reserva: se o casal mudar o preço depois,
  -- o pedido pendente continua valendo o que foi cobrado.
  valor_unitario_centavos  integer not null check (valor_unitario_centavos > 0)
);

create index if not exists idx_itens_pedido on pedido_itens (pedido_id);

-- ---------------------------------------------------------------------
-- Eventos de webhook
--
-- Invariante 4: idempotência por constraint, não por if. Dois POSTs do
-- mesmo evento — coisa normal no Mercado Pago — não contam duas vezes.
-- ---------------------------------------------------------------------
create table if not exists webhook_eventos (
  id          uuid primary key default gen_random_uuid(),
  psp         text not null,
  evento_id   text not null,
  tipo        text,
  payload     jsonb,
  recebido_em timestamptz not null default now(),

  constraint evento_unico unique (psp, evento_id)
);

-- =====================================================================
-- Funções
-- =====================================================================

-- Invariantes 1 e 2. O valor sai daqui, do banco — a rota /api/pedidos
-- não aceita campo de preço vindo do cliente.
create or replace function reservar_cotas(p_presente uuid, p_cotas integer)
returns integer
language plpgsql
as $$
declare
  v_valor integer;
begin
  if p_cotas <= 0 then
    raise exception 'quantidade de cotas invalida: %', p_cotas;
  end if;

  update presentes
     set cotas_reservadas = cotas_reservadas + p_cotas
   where id = p_presente
     and ativo
  returning valor_centavos into v_valor;

  if v_valor is null then
    raise exception 'presente % inexistente ou inativo', p_presente
      using errcode = 'no_data_found';
  end if;

  return v_valor;
end;
$$;

-- Reserva vira venda. Idempotente: chamar duas vezes no mesmo pedido
-- não move nada na segunda.
create or replace function confirmar_pedido(p_pedido uuid, p_pagamento text)
returns boolean
language plpgsql
as $$
declare
  v_item record;
begin
  update pedidos
     set status = 'pago',
         pago_em = now(),
         psp_pagamento_id = coalesce(psp_pagamento_id, p_pagamento)
   where id = p_pedido
     and status = 'pendente';

  if not found then
    return false; -- já pago, expirado ou inexistente
  end if;

  for v_item in select presente_id, cotas from pedido_itens where pedido_id = p_pedido loop
    update presentes
       set cotas_reservadas = cotas_reservadas - v_item.cotas,
           cotas_vendidas   = cotas_vendidas   + v_item.cotas
     where id = v_item.presente_id;
  end loop;

  return true;
end;
$$;

-- Invariante 3. Devolve quantos pedidos foram expirados — o cron do
-- GitHub Actions confere esse número na resposta.
create or replace function expirar_pedidos()
returns integer
language plpgsql
as $$
declare
  v_pedido record;
  v_item   record;
  v_total  integer := 0;
begin
  for v_pedido in
    select id from pedidos
     where status = 'pendente'
       and expira_em < now()
     for update skip locked
  loop
    update pedidos set status = 'expirado' where id = v_pedido.id;

    for v_item in select presente_id, cotas from pedido_itens where pedido_id = v_pedido.id loop
      update presentes
         set cotas_reservadas = cotas_reservadas - v_item.cotas
       where id = v_item.presente_id;
    end loop;

    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

-- =====================================================================
-- Views
-- =====================================================================

create or replace view v_presentes as
select
  p.id,
  p.slug,
  p.grupo,
  p.tipo,
  p.nome,
  p.descricao,
  p.valor_centavos,
  p.meta_cotas,
  p.meta_valor_centavos,
  p.ordem,
  case
    when p.meta_cotas is null then null
    else p.meta_cotas - p.cotas_reservadas - p.cotas_vendidas
  end as cotas_restantes,
  p.cotas_vendidas * p.valor_centavos as arrecadado_centavos
from presentes p
where p.ativo
order by p.grupo, p.ordem;

-- O que a barra da maré lê. Uma linha só.
create or replace view v_gravata as
select
  coalesce(sum(p.cotas_vendidas * p.valor_centavos), 0) as arrecadado_centavos,
  max(p.meta_valor_centavos)                            as meta_centavos,
  coalesce(sum(p.cotas_vendidas), 0)                    as pessoas
from presentes p
where p.grupo = 'gravata';
