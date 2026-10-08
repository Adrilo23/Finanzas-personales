-- =============================================================
-- Migración 0012 — Objetivos de ahorro
-- Un objetivo (nombre, importe, fecha opcional) y sus aportaciones manuales.
-- Lo ahorrado es la suma de las aportaciones (las retiradas van en negativo);
-- el progreso y el ritmo se calculan en la app (lib/goals.ts).
-- Las aportaciones NO son movimientos: no tocan saldos de cuentas ni informes.
-- =============================================================

create table public.savings_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 80),
  icon          text,
  target_cents  bigint not null check (target_cents > 0),
  target_date   date,
  created_at    timestamptz not null default now()
);

create index savings_goals_user_idx on public.savings_goals (user_id, created_at);

create table public.goal_contributions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  goal_id            uuid not null references public.savings_goals(id) on delete cascade,
  -- Positivo = aportación; negativo = retirada.
  amount_cents       bigint not null check (amount_cents <> 0),
  contribution_date  date not null default current_date,
  note               text,
  created_at         timestamptz not null default now()
);

create index goal_contributions_goal_idx on public.goal_contributions (goal_id, contribution_date);

alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;

create policy "savings_goals_select_own" on public.savings_goals
  for select using (user_id = auth.uid());
create policy "savings_goals_insert_own" on public.savings_goals
  for insert with check (user_id = auth.uid());
create policy "savings_goals_update_own" on public.savings_goals
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "savings_goals_delete_own" on public.savings_goals
  for delete using (user_id = auth.uid());

-- La FK goal_id no pasa por RLS: exigimos que el objetivo sea del mismo usuario.
create policy "goal_contributions_select_own" on public.goal_contributions
  for select using (user_id = auth.uid());
create policy "goal_contributions_insert_own" on public.goal_contributions
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.savings_goals g where g.id = goal_id and g.user_id = auth.uid())
  );
create policy "goal_contributions_update_own" on public.goal_contributions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goal_contributions_delete_own" on public.goal_contributions
  for delete using (user_id = auth.uid());
