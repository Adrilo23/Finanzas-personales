-- =============================================================
-- Migración 0003 — Adjuntos (tickets/facturas)
-- =============================================================

create table public.attachments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  storage_path    text not null,
  file_name       text not null,
  uploaded_at     timestamptz not null default now()
);

create index attachments_transaction_id_idx on public.attachments (transaction_id);
create index attachments_user_id_idx on public.attachments (user_id);

alter table public.attachments enable row level security;

create policy "attachments_select_own" on public.attachments
  for select using (user_id = auth.uid());
create policy "attachments_insert_own" on public.attachments
  for insert with check (user_id = auth.uid());
create policy "attachments_delete_own" on public.attachments
  for delete using (user_id = auth.uid());

-- =============================================================
-- Bucket de Storage privado, con acceso solo a la carpeta propia
-- del usuario (convención de ruta: {user_id}/{transaction_id}/archivo)
-- =============================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_storage_select_own"
  on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_storage_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_storage_delete_own"
  on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
