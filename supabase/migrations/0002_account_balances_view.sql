-- =============================================================
-- Migración 0002 — Vista de saldos por cuenta
-- =============================================================

create or replace view public.account_balances
with (security_invoker = on) as
select
  a.id,
  a.user_id,
  a.name,
  a.type,
  a.currency,
  a.initial_balance_cents,
  a.initial_balance_cents
    + coalesce(sum(t.amount_cents) filter (where t.deleted_at is null), 0) as balance_cents,
  a.created_at
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;
