-- =============================================================
-- Migración 0004 — Borrar una cuenta borra también sus movimientos
-- (antes: ON DELETE RESTRICT, bloqueaba el borrado si había movimientos,
-- incluidos los ya eliminados con soft delete)
-- =============================================================

alter table public.transactions
  drop constraint transactions_account_id_fkey;

alter table public.transactions
  add constraint transactions_account_id_fkey
  foreign key (account_id) references public.accounts(id) on delete cascade;
