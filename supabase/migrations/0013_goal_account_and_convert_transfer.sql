-- =============================================================
-- Migración 0013 — Objetivos vinculados a una cuenta y conversión a traspaso
--
-- 1) savings_goals.account_id (opcional): si un objetivo está vinculado a una
--    cuenta, su progreso es el saldo de esa cuenta (vista account_balances) y no
--    se registran aportaciones manuales. Las que hubiera se conservan, pero no
--    cuentan mientras esté vinculado.
-- 2) convert_to_transfer: convierte un movimiento con categoría de tipo
--    'investment' (lo que antes de existir los traspasos se registraba como
--    «inversión», p. ej. aportaciones al bróker) en la pata de salida de un
--    traspaso, y crea la pata de entrada en la cuenta destino. Atómica.
-- =============================================================

-- 1) Objetivo vinculado a una cuenta ---------------------------------------------
alter table public.savings_goals
  add column account_id uuid references public.accounts(id) on delete set null;

-- La FK no pasa por RLS: exigimos que la cuenta vinculada sea del mismo usuario.
drop policy "savings_goals_insert_own" on public.savings_goals;
drop policy "savings_goals_update_own" on public.savings_goals;

create policy "savings_goals_insert_own" on public.savings_goals
  for insert with check (
    user_id = auth.uid()
    and (account_id is null
         or exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()))
  );
create policy "savings_goals_update_own" on public.savings_goals
  for update using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and (account_id is null
         or exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()))
  );

-- 2) Convertir un movimiento de inversión en traspaso ---------------------------
-- security invoker: la RLS de transactions, categories y accounts se aplica con la
-- sesión del usuario, así que solo ve y toca lo suyo.
create or replace function public.convert_to_transfer(
  p_transaction_id uuid,
  p_to_account     uuid
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  t             public.transactions%rowtype;
  v_type        text;
  v_transfer_id uuid := gen_random_uuid();
begin
  select * into t
  from public.transactions
  where id = p_transaction_id and deleted_at is null
  for update;

  if not found then
    raise exception 'El movimiento no existe o se ha eliminado';
  end if;
  if t.transfer_id is not null then
    raise exception 'El movimiento ya es un traspaso';
  end if;

  select type into v_type from public.categories where id = t.category_id;
  if v_type is distinct from 'investment' then
    raise exception 'Solo se pueden convertir movimientos de inversión';
  end if;
  if t.amount_cents >= 0 then
    raise exception 'Solo se pueden convertir salidas de dinero';
  end if;

  if p_to_account = t.account_id then
    raise exception 'La cuenta de destino debe ser distinta de la de origen';
  end if;
  -- La FK no pasa por RLS: comprobamos que la cuenta destino es del usuario.
  if not exists (select 1 from public.accounts where id = p_to_account) then
    raise exception 'Cuenta no válida';
  end if;

  -- Pata de salida: el propio movimiento, sin categoría (conserva adjuntos e historial).
  update public.transactions
  set category_id = null,
      transfer_id = v_transfer_id
  where id = t.id;

  -- Pata de entrada en la cuenta destino.
  insert into public.transactions
    (user_id, account_id, category_id, amount_cents, currency, description,
     transaction_date, transfer_id)
  values
    (t.user_id, p_to_account, null, -t.amount_cents, t.currency, t.description,
     t.transaction_date, v_transfer_id);

  return v_transfer_id;
end;
$$;
