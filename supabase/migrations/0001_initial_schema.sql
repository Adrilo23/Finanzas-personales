-- =============================================================
-- Migración inicial — App Ingresos/Gastos
-- Tablas: accounts, categories, recurring_rules, transactions
-- RLS activado desde el día 1 en todas las tablas.
-- =============================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- =============================================================
-- accounts
-- =============================================================
create table public.accounts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  name                   text not null,
  type                   text not null check (type in ('bank', 'cash', 'card', 'other')),
  currency               text not null default 'EUR',
  initial_balance_cents  bigint not null default 0,
  created_at             timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

create policy "accounts_select_own" on public.accounts
  for select using (user_id = auth.uid());
create policy "accounts_insert_own" on public.accounts
  for insert with check (user_id = auth.uid());
create policy "accounts_update_own" on public.accounts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "accounts_delete_own" on public.accounts
  for delete using (user_id = auth.uid());

-- =============================================================
-- categories
-- =============================================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  parent_id   uuid references public.categories(id) on delete set null,
  name        text not null,
  type        text not null check (type in ('income', 'expense', 'investment')),
  icon        text,
  created_at  timestamptz not null default now()
);

create index categories_user_id_idx on public.categories (user_id);
create index categories_parent_id_idx on public.categories (parent_id);

alter table public.categories enable row level security;

create policy "categories_select_own" on public.categories
  for select using (user_id = auth.uid());
create policy "categories_insert_own" on public.categories
  for insert with check (user_id = auth.uid());
create policy "categories_update_own" on public.categories
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories_delete_own" on public.categories
  for delete using (user_id = auth.uid());

-- =============================================================
-- recurring_rules
-- (se crea antes que transactions porque esta última la referencia)
-- =============================================================
create table public.recurring_rules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  account_id    uuid not null references public.accounts(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete set null,
  amount_cents  bigint not null,
  frequency     text not null check (frequency in ('monthly', 'weekly', 'yearly', 'custom')),
  next_run_date date not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index recurring_rules_user_id_idx on public.recurring_rules (user_id);

alter table public.recurring_rules enable row level security;

create policy "recurring_rules_select_own" on public.recurring_rules
  for select using (user_id = auth.uid());
create policy "recurring_rules_insert_own" on public.recurring_rules
  for insert with check (user_id = auth.uid());
create policy "recurring_rules_update_own" on public.recurring_rules
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recurring_rules_delete_own" on public.recurring_rules
  for delete using (user_id = auth.uid());

-- =============================================================
-- transactions
-- Tabla central del ledger. Soft delete via deleted_at
-- (mantiene trazabilidad e integridad de saldos históricos).
-- =============================================================
create table public.transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  account_id         uuid not null references public.accounts(id) on delete restrict,
  category_id        uuid references public.categories(id) on delete set null,
  amount_cents       bigint not null,
  currency           text not null default 'EUR',
  description        text,
  transaction_date   date not null default current_date,
  recurring_rule_id  uuid references public.recurring_rules(id) on delete set null,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, transaction_date);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_category_id_idx on public.transactions (category_id);

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select using (user_id = auth.uid());
create policy "transactions_insert_own" on public.transactions
  for insert with check (user_id = auth.uid());
create policy "transactions_update_own" on public.transactions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transactions_delete_own" on public.transactions
  for delete using (user_id = auth.uid());

-- Mantener updated_at al día en cada UPDATE
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- =============================================================
-- Precarga de categorías por defecto para cada usuario nuevo
-- =============================================================
create or replace function public.handle_new_user_categories()
returns trigger as $$
begin
  insert into public.categories (user_id, name, type) values
    (new.id, 'Nómina',        'income'),
    (new.id, 'Otros ingresos','income'),
    (new.id, 'Alquiler',      'expense'),
    (new.id, 'Alimentación',  'expense'),
    (new.id, 'Transporte',    'expense'),
    (new.id, 'Ocio',          'expense'),
    (new.id, 'Suministros',   'expense'),
    (new.id, 'Salud',         'expense'),
    (new.id, 'Otros gastos',  'expense'),
    (new.id, 'Inversión',     'investment');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created_categories
  after insert on auth.users
  for each row execute function public.handle_new_user_categories();
