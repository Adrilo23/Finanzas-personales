-- =============================================================
-- Migración 0007 — Cuentas de inversión con fondos
-- Una cuenta de tipo 'investment' (p. ej. MyInvestor o Kraken) contiene activos
-- (holdings): fondos identificados por ISIN o criptomonedas (sin ISIN). Todos se
-- identifican por su código en la fuente de precios (symbol: '0P0001CLDK.F',
-- 'BTC-EUR'). Cada activo tiene sus operaciones de compra/venta con las
-- participaciones (o unidades de cripto) introducidas a mano desde el bróker.
-- El valor de mercado = participaciones × último precio, calculado aquí con
-- numeric y redondeado a céntimos (nunca con float en JS).
--
-- asset_prices es POR USUARIO en esta fase: la app lo rellena con la sesión del
-- propio usuario, y una tabla compartida permitiría a cualquiera escribir precios
-- que verían los demás. Al pasar a una actualización programada con service role
-- (roadmap, Fase 3b tanda 2) se podrá convertir en una tabla compartida.
-- =============================================================

-- 1) Nuevo tipo de cuenta -------------------------------------------------------
do $$
declare
  c record;
begin
  -- El check original es anónimo (Postgres lo llama accounts_type_check); se busca por
  -- definición para no depender del nombre.
  for c in
    select conname from pg_constraint
    where conrelid = 'public.accounts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.accounts drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.accounts
  add constraint accounts_type_check
  check (type in ('bank', 'cash', 'card', 'investment', 'other'));

-- 2) Activos de cada cuenta -----------------------------------------------------
create table public.holdings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  account_id         uuid not null references public.accounts(id) on delete cascade,
  asset_type         text not null check (asset_type in ('fund', 'crypto')),
  isin               text check (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),  -- solo fondos
  symbol             text not null,            -- código en la fuente de precios (Yahoo)
  name               text not null,
  currency           text not null default 'EUR',
  prices_checked_at  timestamptz,              -- último intento de refrescar precios
  created_at         timestamptz not null default now(),
  unique (account_id, symbol),
  check (asset_type <> 'fund' or isin is not null)
);

create index holdings_user_id_idx on public.holdings (user_id);

alter table public.holdings enable row level security;

create policy "holdings_select_own" on public.holdings
  for select using (user_id = auth.uid());
create policy "holdings_insert_own" on public.holdings
  for insert with check (user_id = auth.uid());
create policy "holdings_update_own" on public.holdings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "holdings_delete_own" on public.holdings
  for delete using (user_id = auth.uid());

-- 3) Operaciones de cada activo --------------------------------------------------
create table public.holding_operations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  holding_id      uuid not null references public.holdings(id) on delete cascade,
  operation_date  date not null,
  kind            text not null check (kind in ('buy', 'sell')),
  units           numeric(20, 8) not null check (units > 0),
  amount_cents    bigint not null check (amount_cents > 0),
  created_at      timestamptz not null default now()
);

create index holding_operations_holding_id_idx on public.holding_operations (holding_id);
create index holding_operations_user_id_idx on public.holding_operations (user_id);

alter table public.holding_operations enable row level security;

create policy "holding_operations_select_own" on public.holding_operations
  for select using (user_id = auth.uid());
create policy "holding_operations_insert_own" on public.holding_operations
  for insert with check (user_id = auth.uid());
create policy "holding_operations_update_own" on public.holding_operations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "holding_operations_delete_own" on public.holding_operations
  for delete using (user_id = auth.uid());

-- 4) Precios diarios (valor liquidativo de fondos, cierre de cripto), por usuario
create table public.asset_prices (
  user_id     uuid not null references auth.users(id) on delete cascade,
  symbol      text not null,
  price_date  date not null,
  price       numeric(20, 8) not null check (price > 0),
  currency    text not null default 'EUR',
  fetched_at  timestamptz not null default now(),
  primary key (user_id, symbol, price_date)
);

alter table public.asset_prices enable row level security;

create policy "asset_prices_select_own" on public.asset_prices
  for select using (user_id = auth.uid());
create policy "asset_prices_insert_own" on public.asset_prices
  for insert with check (user_id = auth.uid());
create policy "asset_prices_update_own" on public.asset_prices
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "asset_prices_delete_own" on public.asset_prices
  for delete using (user_id = auth.uid());

-- 5) Valor de cada activo -------------------------------------------------------
-- invested_cents = aportado neto (compras − ventas); gain_cents = valor − aportado.
create view public.holding_values
with (security_invoker = on) as
select
  h.id,
  h.user_id,
  h.account_id,
  h.asset_type,
  h.isin,
  h.symbol,
  h.name,
  h.currency,
  coalesce(ops.units, 0)::numeric(20, 8)                        as units,
  coalesce(ops.invested_cents, 0)::bigint                       as invested_cents,
  p.price,
  p.price_date,
  round(coalesce(ops.units, 0) * coalesce(p.price, 0) * 100)::bigint as value_cents,
  (round(coalesce(ops.units, 0) * coalesce(p.price, 0) * 100)
    - coalesce(ops.invested_cents, 0))::bigint                  as gain_cents
from public.holdings h
left join lateral (
  select
    sum(case when o.kind = 'buy' then o.units else -o.units end)               as units,
    sum(case when o.kind = 'buy' then o.amount_cents else -o.amount_cents end) as invested_cents
  from public.holding_operations o
  where o.holding_id = h.id
) ops on true
left join lateral (
  select ap.price, ap.price_date
  from public.asset_prices ap
  where ap.user_id = h.user_id and ap.symbol = h.symbol
  order by ap.price_date desc
  limit 1
) p on true;

-- 6) Saldo de las cuentas: incluye el valor de mercado de sus activos ------------
-- Se recrea la vista (mismas columnas y orden + market_value_cents al final).
-- Subconsultas en vez de joins para no multiplicar filas entre movimientos y fondos.
drop view public.account_balances;

create view public.account_balances
with (security_invoker = on) as
select
  a.id,
  a.user_id,
  a.name,
  a.type,
  a.currency,
  a.initial_balance_cents,
  (a.initial_balance_cents
    + coalesce((select sum(t.amount_cents) from public.transactions t
                where t.account_id = a.id and t.deleted_at is null), 0)
    + coalesce((select sum(hv.value_cents) from public.holding_values hv
                where hv.account_id = a.id), 0))::bigint as balance_cents,
  a.created_at,
  coalesce((select sum(hv.value_cents) from public.holding_values hv
            where hv.account_id = a.id), 0)::bigint      as market_value_cents
from public.accounts a;
