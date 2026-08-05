-- =====================================================================
-- Dados iniciais dos presentes.
--
-- Dimensionamento: 110 convidados ≈ 55 famílias, das quais ~30 presenteiam.
-- 37 unidades à venda (8 produtos + 29 cotas), oferta de R$ 13.860 contra
-- arrecadação realista de R$ 9.810 — a lista fecha em torno de 71%.
--
-- "Restam 2" faz alguém decidir; "restam 12" não move ninguém.
--
-- psql "$DATABASE_URL" -f db/seed.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- Para a casa — produto: uma unidade, some da lista quando alguém leva
-- ---------------------------------------------------------------------
insert into presentes (slug, grupo, tipo, nome, valor_centavos, meta_cotas, ordem) values
  ('air-fryer',        'casa', 'produto', 'Air fryer',          50000, 1, 1),
  ('panelas',          'casa', 'produto', 'Jogo de panelas',    45000, 1, 2),
  ('aparelho-jantar',  'casa', 'produto', 'Aparelho de jantar', 40000, 1, 3),
  ('cafeteira',        'casa', 'produto', 'Cafeteira',          35000, 1, 4),
  ('lencois',          'casa', 'produto', 'Jogo de lençóis',    30000, 1, 5),
  ('faqueiro',         'casa', 'produto', 'Faqueiro',           30000, 1, 6),
  ('toalhas',          'casa', 'produto', 'Toalhas',            20000, 1, 7),
  ('tacas',            'casa', 'produto', 'Taças',              18000, 1, 8)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Para a lua de mel — cota: várias pessoas dividem a mesma experiência
-- ---------------------------------------------------------------------
insert into presentes (slug, grupo, tipo, nome, valor_centavos, meta_cotas, ordem) values
  ('iglu',    'lua_de_mel', 'cota', 'Uma noite no iglu de vidro',     54000, 5, 1),
  ('aurora',  'lua_de_mel', 'cota', 'Caçar a aurora boreal',          26000, 6, 2),
  ('huskies', 'lua_de_mel', 'cota', 'Trenó puxado por huskies',       24000, 8, 3),
  ('balsa',   'lua_de_mel', 'cota', 'A balsa até Tallinn',            24000, 4, 4),
  ('sauna',   'lua_de_mel', 'cota', 'Sauna no Löyly',                 15000, 2, 5),
  ('drinks',  'lua_de_mel', 'cota', 'Uma rodada de drinks',            6000, 4, 6)
on conflict (slug) do nothing;

-- Valor livre: 1 cota = R$ 1,00. Quem escolhe R$ 75 reserva 75 cotas.
-- meta_cotas em null porque não há teto.
insert into presentes (slug, grupo, tipo, nome, valor_centavos, meta_cotas, ordem) values
  ('valor-livre', 'lua_de_mel', 'livre', 'Um valor livre', 100, null, 7)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- A gravata — três cotas fixas, sem teto
--
-- meta_cotas em null: nunca esgota, nunca devolve "cotas esgotadas" para
-- quem chegou por último. A meta de R$ 3.500 vive em meta_valor_centavos
-- e só alimenta a barra da maré.
-- ---------------------------------------------------------------------
insert into presentes (slug, grupo, tipo, nome, valor_centavos, meta_cotas, meta_valor_centavos, ordem) values
  ('gravata-30',  'gravata', 'gravata', 'Cota de R$ 30',   3000, null, 350000, 1),
  ('gravata-50',  'gravata', 'gravata', 'Cota de R$ 50',   5000, null, 350000, 2),
  ('gravata-100', 'gravata', 'gravata', 'Cota de R$ 100', 10000, null, 350000, 3)
on conflict (slug) do nothing;
