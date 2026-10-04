-- =============================================================
-- Migración 0005 — Presupuestos por categoría
-- Un presupuesto mensual recurrente por categoría de gasto.
-- Lo gastado en las subcategorías cuenta para el presupuesto del padre
-- (el cálculo se hace en la app, app/budgets/page.tsx).
-- =============================================================

create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  amount_cents  bigint not null check (amount_cents > 0),
  created_at    timestamptz not null default now(),
  -- También sirve de índice para las consultas por user_id.
  unique (user_id, category_id)
);

alter table public.budgets enable row level security;

create policy "budgets_select_own" on public.budgets
  for select using (user_id = auth.uid());
create policy "budgets_insert_own" on public.budgets
  for insert with check (user_id = auth.uid());
create policy "budgets_update_own" on public.budgets
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budgets_delete_own" on public.budgets
  for delete using (user_id = auth.uid());
