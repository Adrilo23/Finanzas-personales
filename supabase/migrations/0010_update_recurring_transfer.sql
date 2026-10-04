-- =============================================================
-- 0010 · Edición de traspasos recurrentes y planes de aportación
-- Cambiar un plan es actualizar la regla y sustituir su reparto en activos
-- (recurring_allocations). Se hace en una sola función para que nunca quede
-- una regla con el importe nuevo y el reparto viejo, o sin reparto.
-- =============================================================

create or replace function public.update_recurring_transfer(
  p_rule_id       uuid,
  p_from_account  uuid,
  p_to_account    uuid,
  p_amount_cents  bigint,
  p_frequency     text,
  p_next_run_date date,
  p_allocations   jsonb  -- [{ "holding_id": uuid, "amount_cents": bigint }, ...]
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
  -- Las FK no pasan por RLS: comprobamos que cuentas y activos son del usuario.
  if (select count(*) from public.accounts where id in (p_from_account, p_to_account)) <> 2 then
    raise exception 'Cuenta no válida';
  end if;
  if (select count(*) from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) a
      where not exists (select 1 from public.holdings h where h.id = (a->>'holding_id')::uuid)) > 0 then
    raise exception 'Activo no válido en el reparto';
  end if;

  update public.recurring_rules
  set account_id    = p_from_account,
      to_account_id = p_to_account,
      amount_cents  = p_amount_cents,
      frequency     = p_frequency,
      next_run_date = p_next_run_date,
      anchor_day    = extract(day from p_next_run_date)::smallint
  where id = p_rule_id
    and to_account_id is not null;

  if not found then
    raise exception 'La regla no existe o no es un traspaso';
  end if;

  delete from public.recurring_allocations where rule_id = p_rule_id;

  insert into public.recurring_allocations (user_id, rule_id, holding_id, amount_cents)
  select auth.uid(), p_rule_id, (a->>'holding_id')::uuid, (a->>'amount_cents')::bigint
  from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) a;
end;
$$;
