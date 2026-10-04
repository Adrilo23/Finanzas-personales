-- =============================================================
-- Migración 0009 — Plan de aportación periódica
-- Un traspaso recurrente (recurring_rules con to_account_id) puede repartir el
-- dinero entre activos (recurring_allocations). En cada vencimiento se genera:
--   1. el traspaso origen → destino de la regla (p. ej. BBVA → My Investor, 500 €);
--   2. un traspaso destino → cuenta del activo si el activo está en otra cuenta
--      (p. ej. My Investor → Kraken, 50 €);
--   3. una compra PENDIENTE por activo, con participaciones estimadas
--      (importe ÷ último precio). El usuario la confirma con las reales del bróker.
-- Todo en una sola función (atómica): o se genera el mes entero o nada.
-- =============================================================

-- 1) Reparto de un traspaso recurrente entre activos ----------------------------
create table public.recurring_allocations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  rule_id       uuid not null references public.recurring_rules(id) on delete cascade,
  holding_id    uuid not null references public.holdings(id) on delete cascade,
  amount_cents  bigint not null check (amount_cents > 0),
  created_at    timestamptz not null default now(),
  unique (rule_id, holding_id)
);

create index recurring_allocations_rule_id_idx on public.recurring_allocations (rule_id);

alter table public.recurring_allocations enable row level security;

create policy "recurring_allocations_select_own" on public.recurring_allocations
  for select using (user_id = auth.uid());
create policy "recurring_allocations_insert_own" on public.recurring_allocations
  for insert with check (user_id = auth.uid());
create policy "recurring_allocations_update_own" on public.recurring_allocations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recurring_allocations_delete_own" on public.recurring_allocations
  for delete using (user_id = auth.uid());

-- 2) Compras pendientes de confirmar --------------------------------------------
alter table public.holding_operations
  add column status text not null default 'confirmed'
    check (status in ('pending', 'confirmed')),
  add column recurring_rule_id uuid references public.recurring_rules(id) on delete set null;

-- Una compra pendiente puede no tener todavía participaciones (si no había precio
-- con el que estimarlas); una confirmada siempre las tiene.
alter table public.holding_operations
  alter column units drop not null;

alter table public.holding_operations
  add constraint holding_operations_units_when_confirmed
  check (units is not null or status = 'pending');

-- 3) Generación atómica de un plan ----------------------------------------------
-- security invoker: se ejecuta con la sesión del usuario y su RLS. p_dates son los
-- vencimientos (calculados en la app con computeDueDates) y p_next la siguiente fecha.
create or replace function public.run_contribution_plan(
  p_rule_id  uuid,
  p_dates    date[],
  p_next     date
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r          public.recurring_rules%rowtype;
  d          date;
  a          record;
  v_transfer uuid;
  v_price    numeric;
begin
  select * into r from public.recurring_rules
  where id = p_rule_id and to_account_id is not null and active;
  if not found then
    raise exception 'Plan no encontrado';
  end if;

  foreach d in array p_dates loop
    -- 1. Traspaso de la regla.
    v_transfer := gen_random_uuid();
    insert into public.transactions
      (user_id, account_id, amount_cents, currency, transaction_date, recurring_rule_id, transfer_id)
    values
      (r.user_id, r.account_id,    -r.amount_cents, 'EUR', d, r.id, v_transfer),
      (r.user_id, r.to_account_id,  r.amount_cents, 'EUR', d, r.id, v_transfer);

    for a in
      select ra.amount_cents, h.id as holding_id, h.account_id, h.symbol
      from public.recurring_allocations ra
      join public.holdings h on h.id = ra.holding_id
      where ra.rule_id = r.id
    loop
      -- 2. Si el activo está en otra cuenta, el dinero sigue desde el destino hasta ella.
      if a.account_id <> r.to_account_id then
        v_transfer := gen_random_uuid();
        insert into public.transactions
          (user_id, account_id, amount_cents, currency, transaction_date, recurring_rule_id, transfer_id)
        values
          (r.user_id, r.to_account_id, -a.amount_cents, 'EUR', d, r.id, v_transfer),
          (r.user_id, a.account_id,     a.amount_cents, 'EUR', d, r.id, v_transfer);
      end if;

      -- 3. Compra pendiente con participaciones estimadas (numeric, 8 decimales).
      select ap.price into v_price
      from public.asset_prices ap
      where ap.user_id = r.user_id and ap.symbol = a.symbol and ap.price_date <= d
      order by ap.price_date desc
      limit 1;

      insert into public.holding_operations
        (user_id, holding_id, operation_date, kind, units, amount_cents,
         affects_cash, status, recurring_rule_id)
      values
        (r.user_id, a.holding_id, d, 'buy',
         case when v_price is null then null else round((a.amount_cents / 100.0) / v_price, 8) end,
         a.amount_cents, true, 'pending', r.id);
    end loop;
  end loop;

  update public.recurring_rules set next_run_date = p_next where id = r.id;
end;
$$;
