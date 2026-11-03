-- =============================================================
-- Migración 0014 — Endurecimiento tras la auditoría de seguridad (oct 2026)
--
-- 1) Propiedad de las FK en RLS. Las políticas de insert/update solo exigían
--    user_id = auth.uid(), y las FK no pasan por RLS: un usuario podía crear filas
--    propias que apuntaran a cuentas, categorías o movimientos de otro (p. ej. un
--    adjunto con el transaction_id y la ruta de Storage de otro usuario). Sin fuga de
--    datos, pero sí un agujero de integridad. Ahora cada FK debe ser del usuario.
-- 2) Límites de importe en la base de datos (≠ 0 y como mucho 1.000 millones de €),
--    porque PostgREST es accesible con el JWT del usuario sin pasar por la app.
-- 3) Bucket de adjuntos: solo imágenes y PDF de hasta 10 MB, y la segunda carpeta de
--    la ruta debe ser un movimiento propio.
-- 4) Limitador de intentos de login (login_attempts + funciones).
-- =============================================================

-- 1) Funciones auxiliares de propiedad ------------------------------------------
-- security invoker + RLS: solo «ven» filas del propio usuario, así que basta con
-- comprobar que la fila existe. stable: se pueden evaluar una vez por sentencia.
create or replace function public.owns_account(p_id uuid) returns boolean
language sql stable security invoker set search_path = public as
$$ select exists (select 1 from public.accounts where id = p_id and user_id = auth.uid()) $$;

create or replace function public.owns_category(p_id uuid) returns boolean
language sql stable security invoker set search_path = public as
$$ select exists (select 1 from public.categories where id = p_id and user_id = auth.uid()) $$;

create or replace function public.owns_transaction(p_id uuid) returns boolean
language sql stable security invoker set search_path = public as
$$ select exists (select 1 from public.transactions where id = p_id and user_id = auth.uid()) $$;

-- Variante para rutas de Storage (texto): una carpeta que no sea un uuid simplemente no
-- coincide, en vez de fallar con un error de conversión.
create or replace function public.owns_transaction_path(p_folder text) returns boolean
language sql stable security invoker set search_path = public as
$$ select exists (select 1 from public.transactions where id::text = p_folder and user_id = auth.uid()) $$;

create or replace function public.owns_recurring_rule(p_id uuid) returns boolean
language sql stable security invoker set search_path = public as
$$ select exists (select 1 from public.recurring_rules where id = p_id and user_id = auth.uid()) $$;

create or replace function public.owns_holding(p_id uuid) returns boolean
language sql stable security invoker set search_path = public as
$$ select exists (select 1 from public.holdings where id = p_id and user_id = auth.uid()) $$;

-- categories: el padre (si hay) es propio
drop policy "categories_insert_own" on public.categories;
drop policy "categories_update_own" on public.categories;
create policy "categories_insert_own" on public.categories
  for insert with check (user_id = auth.uid() and (parent_id is null or public.owns_category(parent_id)));
create policy "categories_update_own" on public.categories
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and (parent_id is null or public.owns_category(parent_id)));

-- recurring_rules: cuenta, cuenta destino y categoría propias
drop policy "recurring_rules_insert_own" on public.recurring_rules;
drop policy "recurring_rules_update_own" on public.recurring_rules;
create policy "recurring_rules_insert_own" on public.recurring_rules
  for insert with check (
    user_id = auth.uid()
    and public.owns_account(account_id)
    and (to_account_id is null or public.owns_account(to_account_id))
    and (category_id is null or public.owns_category(category_id))
  );
create policy "recurring_rules_update_own" on public.recurring_rules
  for update using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and public.owns_account(account_id)
    and (to_account_id is null or public.owns_account(to_account_id))
    and (category_id is null or public.owns_category(category_id))
  );

-- transactions: cuenta, categoría y regla propias
drop policy "transactions_insert_own" on public.transactions;
drop policy "transactions_update_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert with check (
    user_id = auth.uid()
    and public.owns_account(account_id)
    and (category_id is null or public.owns_category(category_id))
    and (recurring_rule_id is null or public.owns_recurring_rule(recurring_rule_id))
  );
create policy "transactions_update_own" on public.transactions
  for update using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and public.owns_account(account_id)
    and (category_id is null or public.owns_category(category_id))
    and (recurring_rule_id is null or public.owns_recurring_rule(recurring_rule_id))
  );

-- attachments: movimiento propio y ruta {user_id}/{transaction_id}/...
drop policy "attachments_insert_own" on public.attachments;
create policy "attachments_insert_own" on public.attachments
  for insert with check (
    user_id = auth.uid()
    and public.owns_transaction(transaction_id)
    and split_part(storage_path, '/', 1) = auth.uid()::text
    and split_part(storage_path, '/', 2) = transaction_id::text
    and storage_path not like '%..%'
  );

-- budgets: categoría propia
drop policy "budgets_insert_own" on public.budgets;
drop policy "budgets_update_own" on public.budgets;
create policy "budgets_insert_own" on public.budgets
  for insert with check (user_id = auth.uid() and public.owns_category(category_id));
create policy "budgets_update_own" on public.budgets
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_category(category_id));

-- holdings: cuenta propia
drop policy "holdings_insert_own" on public.holdings;
drop policy "holdings_update_own" on public.holdings;
create policy "holdings_insert_own" on public.holdings
  for insert with check (user_id = auth.uid() and public.owns_account(account_id));
create policy "holdings_update_own" on public.holdings
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_account(account_id));

-- holding_operations: activo propio
drop policy "holding_operations_insert_own" on public.holding_operations;
drop policy "holding_operations_update_own" on public.holding_operations;
create policy "holding_operations_insert_own" on public.holding_operations
  for insert with check (user_id = auth.uid() and public.owns_holding(holding_id));
create policy "holding_operations_update_own" on public.holding_operations
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_holding(holding_id));

-- recurring_allocations: regla y activo propios
drop policy "recurring_allocations_insert_own" on public.recurring_allocations;
drop policy "recurring_allocations_update_own" on public.recurring_allocations;
create policy "recurring_allocations_insert_own" on public.recurring_allocations
  for insert with check (
    user_id = auth.uid() and public.owns_recurring_rule(rule_id) and public.owns_holding(holding_id)
  );
create policy "recurring_allocations_update_own" on public.recurring_allocations
  for update using (user_id = auth.uid()) with check (
    user_id = auth.uid() and public.owns_recurring_rule(rule_id) and public.owns_holding(holding_id)
  );

-- goal_contributions: también al editar (en 0012 solo se comprobaba al insertar)
drop policy "goal_contributions_update_own" on public.goal_contributions;
create policy "goal_contributions_update_own" on public.goal_contributions
  for update using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (select 1 from public.savings_goals g where g.id = goal_id and g.user_id = auth.uid())
  );

-- 2) Límites de importe -----------------------------------------------------------
-- 100.000.000.000 céntimos = 1.000 millones de €, el mismo tope que la app
-- (lib/validation/money-schemas.ts). not valid: se aplica a lo nuevo y a lo que se
-- edite, sin fallar por filas antiguas (p. ej. un movimiento de 0 céntimos de F-05).
alter table public.transactions
  add constraint transactions_amount_range
  check (amount_cents <> 0 and abs(amount_cents) <= 100000000000) not valid;
alter table public.recurring_rules
  add constraint recurring_rules_amount_range
  check (amount_cents <> 0 and abs(amount_cents) <= 100000000000) not valid;
alter table public.accounts
  add constraint accounts_initial_balance_range
  check (abs(initial_balance_cents) <= 100000000000) not valid;
alter table public.budgets
  add constraint budgets_amount_max check (amount_cents <= 100000000000) not valid;
alter table public.holding_operations
  add constraint holding_operations_amount_max check (amount_cents <= 100000000000) not valid;
alter table public.recurring_allocations
  add constraint recurring_allocations_amount_max check (amount_cents <= 100000000000) not valid;
alter table public.savings_goals
  add constraint savings_goals_target_max check (target_cents <= 100000000000) not valid;
alter table public.goal_contributions
  add constraint goal_contributions_amount_range
  check (abs(amount_cents) <= 100000000000) not valid;

-- 3) Bucket de adjuntos ------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    file_size_limit = 10485760
where id = 'attachments';

drop policy if exists "attachments_storage_insert_own" on storage.objects;
create policy "attachments_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.owns_transaction_path((storage.foldername(name))[2])
  );

-- 4) Limitador de intentos de login -----------------------------------------------
-- Sin políticas: nadie la lee ni escribe directamente; solo las funciones de abajo
-- (security definer). Claves = hashes de IP+email / IP (lib/login-throttle.ts).
create table public.login_attempts (
  key            text primary key check (key ~ '^(pair|ip):[0-9a-f]{64}$'),
  failures       integer not null default 0,
  window_start   timestamptz not null default now(),
  blocked_until  timestamptz
);
alter table public.login_attempts enable row level security;
revoke all on table public.login_attempts from anon, authenticated;

-- Segundos de bloqueo que quedan para cualquiera de las claves (0 si ninguna).
create or replace function public.login_throttle_status(p_keys text[]) returns integer
language sql stable security definer set search_path = public as
$$
  select coalesce(max(ceil(extract(epoch from blocked_until - now())))::integer, 0)
  from public.login_attempts
  where key = any(p_keys[1:2]) and blocked_until > now()
$$;

-- Registra un fallo en cada clave; bloquea 15 min al llegar al límite de la ventana
-- de 15 min (5 por IP+email, 30 por IP). Devuelve los segundos de bloqueo (0 si no).
-- No hay función para reiniciar: así no se puede saltar el límite llamándola.
create or replace function public.login_throttle_fail(p_keys text[]) returns integer
language plpgsql security definer set search_path = public as
$$
declare
  k         text;
  v_fails   integer;
  v_limit   integer;
begin
  if p_keys is null then
    return 0;
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

  -- Limpieza: lo que lleva más de un día sin fallos ni bloqueo.
  delete from public.login_attempts
  where window_start < now() - interval '1 day'
    and (blocked_until is null or blocked_until < now());

  return public.login_throttle_status(p_keys);
end;
$$;

revoke all on function public.login_throttle_status(text[]) from public;
revoke all on function public.login_throttle_fail(text[]) from public;
grant execute on function public.login_throttle_status(text[]) to anon, authenticated;
grant execute on function public.login_throttle_fail(text[]) to anon, authenticated;
