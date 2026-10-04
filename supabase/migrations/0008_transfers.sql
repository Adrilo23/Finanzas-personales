-- =============================================================
-- Migración 0008 — Traspasos entre cuentas
-- Un traspaso son dos movimientos enlazados por transfer_id: uno negativo en la
-- cuenta origen y otro positivo en la destino, sin categoría. Mueven saldos pero
-- no cuentan como ingreso, gasto ni presupuesto (todo eso se calcula por categoría).
-- También:
--   · reglas recurrentes de traspaso (to_account_id);
--   · efectivo en las cuentas de inversión: las compras lo consumen y las ventas
--     lo devuelven, salvo las operaciones que no salen de la cuenta (affects_cash
--     = false), como las posiciones iniciales registradas antes de existir los
--     traspasos.
-- =============================================================

-- 1) Traspasos -------------------------------------------------------------------
alter table public.transactions
  add column transfer_id uuid;

alter table public.transactions
  add constraint transactions_transfer_without_category
  check (transfer_id is null or category_id is null);

create index transactions_transfer_id_idx on public.transactions (transfer_id)
  where transfer_id is not null;

-- Edita las dos patas de un traspaso en una sola sentencia (atómico). security invoker:
-- la RLS de transactions y accounts se aplica con la sesión del usuario.
create or replace function public.update_transfer(
  p_transfer_id   uuid,
  p_from_account  uuid,
  p_to_account    uuid,
  p_amount_cents  bigint,
  p_date          date,
  p_description   text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_amount_cents <= 0 then
    raise exception 'El importe debe ser mayor que 0';
  end if;
  if p_from_account = p_to_account then
    raise exception 'La cuenta de origen y la de destino deben ser distintas';
  end if;
  -- Las FK no pasan por RLS: comprobamos que ambas cuentas son del usuario.
  if (select count(*) from public.accounts where id in (p_from_account, p_to_account)) <> 2 then
    raise exception 'Cuenta no válida';
  end if;

  update public.transactions
  set account_id       = case when amount_cents < 0 then p_from_account else p_to_account end,
      amount_cents     = case when amount_cents < 0 then -p_amount_cents else p_amount_cents end,
      transaction_date = p_date,
      description      = p_description
  where transfer_id = p_transfer_id
    and deleted_at is null;

  if not found then
    raise exception 'El traspaso no existe o se ha eliminado';
  end if;
end;
$$;

-- 2) Reglas recurrentes de traspaso ---------------------------------------------
alter table public.recurring_rules
  add column to_account_id uuid references public.accounts(id) on delete cascade;

alter table public.recurring_rules
  add constraint recurring_rules_transfer_accounts
  check (to_account_id is null or (to_account_id <> account_id and category_id is null));

-- 3) Efectivo de las cuentas de inversión ---------------------------------------
alter table public.holding_operations
  add column affects_cash boolean not null default true;

-- Lo registrado hasta ahora son posiciones que ya se tenían: no salió del efectivo
-- de la cuenta (que no existía como tal).
update public.holding_operations set affects_cash = false;

-- 4) Saldo de las cuentas -------------------------------------------------------
-- efectivo = saldo inicial + movimientos − compras + ventas (las que afectan al efectivo)
-- saldo    = efectivo + valor de mercado de los activos
-- Mismas columnas que en 0007 y cash_cents al final.
drop view public.account_balances;

create view public.account_balances
with (security_invoker = on) as
with cash as (
  select
    a.id,
    a.initial_balance_cents
      + coalesce((select sum(t.amount_cents) from public.transactions t
                  where t.account_id = a.id and t.deleted_at is null), 0)
      + coalesce((select sum(case when o.kind = 'sell' then o.amount_cents else -o.amount_cents end)
                  from public.holding_operations o
                  join public.holdings h on h.id = o.holding_id
                  where h.account_id = a.id and o.affects_cash), 0) as cash_cents,
    coalesce((select sum(hv.value_cents) from public.holding_values hv
              where hv.account_id = a.id), 0) as market_value_cents
  from public.accounts a
)
select
  a.id,
  a.user_id,
  a.name,
  a.type,
  a.currency,
  a.initial_balance_cents,
  (c.cash_cents + c.market_value_cents)::bigint as balance_cents,
  a.created_at,
  c.market_value_cents::bigint                  as market_value_cents,
  c.cash_cents::bigint                          as cash_cents
from public.accounts a
join cash c on c.id = a.id;
