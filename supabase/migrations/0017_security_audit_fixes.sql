-- =============================================================
-- Migración 0017 — Correcciones de la auditoría de seguridad (2026-11-08)
--
--  1) Limitador de login: índice para la limpieza y tope de filas.
--  2) run_contribution_plan: bloquea la regla mientras trabaja (no duplica con dos
--     pestañas) y rechaza un plan ya procesado.
--  3) holding_operations.recurring_rule_id: comprobación de pertenencia.
--  4) Permisos: las funciones del usuario y los helpers owns_* solo para `authenticated`;
--     `anon` sin acceso a las tablas.
--  5) Límites de longitud de texto, importe de traspaso positivo y signo coherente con
--     el tipo de categoría (la BD ya no depende solo de la app).
--  6) Límite de frecuencia por usuario (envío del informe por correo y exportaciones).
--  7) Índices en las FK que faltaban y search_path fijo en las funciones security definer.
-- =============================================================

-- 1) Limitador de login ------------------------------------------------------------
create index if not exists login_attempts_window_start_idx
  on public.login_attempts (window_start);

create or replace function public.login_throttle_fail(p_keys text[]) returns integer
language plpgsql security definer set search_path = public, pg_temp as
$$
declare
  k         text;
  v_fails   integer;
  v_limit   integer;
begin
  if p_keys is null then
    return 0;
  end if;

  -- Tope de filas: la función está abierta a `anon` (el login ocurre antes de tener
  -- sesión), así que nadie puede hinchar la tabla con claves inventadas.
  if (select count(*) from (select 1 from public.login_attempts limit 100001) s) > 100000 then
    return public.login_throttle_status(p_keys);
  end if;

  foreach k in array p_keys[1:2] loop
    if k !~ '^(pair|ip):[0-9a-f]{64}$' then
      continue;
    end if;
    v_limit := case when k like 'pair:%' then 5 else 30 end;

    insert into public.login_attempts as a (key, failures, window_start)
    values (k, 1, now())
    on conflict (key) do update
      set failures     = case when a.window_start < now() - interval '15 minutes' then 1 else a.failures + 1 end,
          window_start = case when a.window_start < now() - interval '15 minutes' then now() else a.window_start end
    returning failures into v_fails;

    if v_fails >= v_limit then
      update public.login_attempts
      set blocked_until = now() + interval '15 minutes', failures = 0, window_start = now()
      where key = k;
    end if;
  end loop;

  delete from public.login_attempts
  where window_start < now() - interval '1 day'
    and (blocked_until is null or blocked_until < now());

  return public.login_throttle_status(p_keys);
end;
$$;

-- 2) Planes de aportación: sin duplicados por ejecuciones concurrentes -------------
create or replace function public.run_contribution_plan(
  p_rule_id  uuid,
  p_dates    date[],
  p_next     date
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  r          public.recurring_rules%rowtype;
  d          date;
  a          record;
  v_transfer uuid;
  v_price    numeric;
begin
  -- `for update`: si otra carga está procesando la misma regla, esta espera y después
  -- ve la fecha ya adelantada.
  select * into r from public.recurring_rules
  where id = p_rule_id and to_account_id is not null and active
  for update;
  if not found then
    raise exception 'Plan no encontrado';
  end if;

  if p_dates is null or coalesce(array_length(p_dates, 1), 0) = 0
     or exists (select 1 from unnest(p_dates) x where x < r.next_run_date) then
    raise exception 'Plan ya procesado';
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

-- 3) holding_operations.recurring_rule_id debe ser una regla propia ----------------
drop policy "holding_operations_insert_own" on public.holding_operations;
drop policy "holding_operations_update_own" on public.holding_operations;
create policy "holding_operations_insert_own" on public.holding_operations
  for insert with check (
    user_id = auth.uid()
    and public.owns_holding(holding_id)
    and (recurring_rule_id is null or public.owns_recurring_rule(recurring_rule_id))
  );
create policy "holding_operations_update_own" on public.holding_operations
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.owns_holding(holding_id)
    and (recurring_rule_id is null or public.owns_recurring_rule(recurring_rule_id))
  );

-- 4a) Límite de frecuencia por usuario ---------------------------------------------
-- Sin políticas ni permisos directos: solo se usa desde check_rate_limit (security
-- definer), así que un usuario no puede borrarse sus propios eventos para saltarlo.
create table public.rate_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null check (char_length(action) between 1 and 40),
  created_at  timestamptz not null default now()
);
create index rate_events_user_action_idx on public.rate_events (user_id, action, created_at desc);
alter table public.rate_events enable row level security;
revoke all on table public.rate_events from anon, authenticated;

-- true si la acción está permitida (y la apunta); false si ya se ha superado el límite
-- (p_max veces en la ventana p_window).
create or replace function public.check_rate_limit(p_action text, p_max integer, p_window interval)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as
$$
declare
  v_uid   uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    return false;
  end if;

  delete from public.rate_events where user_id = v_uid and created_at < now() - interval '1 day';

  select count(*) into v_count
  from public.rate_events
  where user_id = v_uid and action = p_action and created_at > now() - p_window;
  if v_count >= p_max then
    return false;
  end if;

  insert into public.rate_events (user_id, action) values (v_uid, p_action);
  return true;
end;
$$;

-- 4b) Permisos de funciones: solo `authenticated` (las del limitador de login siguen
-- abiertas a `anon`: el login ocurre antes de tener sesión).
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = any (array[
        'update_transfer', 'run_contribution_plan', 'update_recurring_transfer',
        'convert_to_transfer', 'owns_account', 'owns_category', 'owns_transaction',
        'owns_transaction_path', 'owns_recurring_rule', 'owns_holding',
        'delete_my_account', 'check_rate_limit'
      ])
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- 4c) `anon` no necesita ninguna tabla: toda la app va con la sesión del usuario.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- 5) Restricciones de datos ----------------------------------------------------------
-- `not valid`: se aplican a lo nuevo y a lo que se modifique, sin revisar lo antiguo.
alter table public.transactions
  add constraint transactions_description_len check (char_length(description) <= 500) not valid;
alter table public.accounts
  add constraint accounts_name_len check (char_length(name) between 1 and 80) not valid;
alter table public.categories
  add constraint categories_name_len check (char_length(name) between 1 and 80) not valid;
alter table public.goal_contributions
  add constraint goal_contributions_note_len check (char_length(note) <= 500) not valid;
alter table public.attachments
  add constraint attachments_file_name_len check (char_length(file_name) <= 255) not valid;

-- Un traspaso recurrente con importe negativo se invertiría.
alter table public.recurring_rules
  add constraint recurring_rules_transfer_positive
  check (to_account_id is null or amount_cents > 0) not valid;

-- Signo coherente con el tipo de categoría (lo pone applyCategorySign en la app, pero
-- PostgREST es accesible directamente). Sin categoría (traspasos) no se comprueba.
-- Solo al insertar o al cambiar importe/categoría: el borrado lógico no la activa.
create or replace function public.enforce_transaction_sign() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as
$$
declare
  v_type text;
begin
  if new.category_id is null then
    return new;
  end if;
  select type into v_type from public.categories where id = new.category_id;
  if v_type = 'income' and new.amount_cents < 0 then
    raise exception 'Un ingreso no puede tener importe negativo' using errcode = '23514';
  elsif v_type in ('expense', 'investment') and new.amount_cents > 0 then
    raise exception 'Un gasto o una inversión no puede tener importe positivo' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger transactions_enforce_sign
  before insert or update of amount_cents, category_id on public.transactions
  for each row execute function public.enforce_transaction_sign();

-- 7) Índices en FK y search_path fijo ----------------------------------------------
create index if not exists transactions_recurring_rule_idx
  on public.transactions (recurring_rule_id) where recurring_rule_id is not null;
create index if not exists recurring_rules_account_idx on public.recurring_rules (account_id);
create index if not exists recurring_rules_to_account_idx
  on public.recurring_rules (to_account_id) where to_account_id is not null;
create index if not exists recurring_rules_category_idx
  on public.recurring_rules (category_id) where category_id is not null;
create index if not exists recurring_allocations_holding_idx on public.recurring_allocations (holding_id);
create index if not exists recurring_allocations_user_idx on public.recurring_allocations (user_id);
create index if not exists holding_ops_rule_idx
  on public.holding_operations (recurring_rule_id) where recurring_rule_id is not null;
create index if not exists goal_contributions_user_idx on public.goal_contributions (user_id);
create index if not exists savings_goals_account_idx
  on public.savings_goals (account_id) where account_id is not null;
create index if not exists budgets_category_idx on public.budgets (category_id);

alter function public.login_throttle_status(text[]) set search_path = public, pg_temp;
alter function public.delete_my_account() set search_path = public, pg_temp;
alter function public.handle_new_user_categories() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
