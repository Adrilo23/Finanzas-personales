-- =============================================================
-- Migración 0016 — Idempotencia para el registro sin conexión
--
-- El navegador puede guardar un movimiento en una cola local cuando no hay conexión y
-- enviarlo después. Si el envío llega al servidor pero la respuesta se pierde, el
-- reintento duplicaría el dinero. Cada movimiento de la cola lleva un `client_id`
-- (uuid generado en el navegador) y el índice único hace que el reintento falle con
-- 23505, que la Server Action trata como «ya guardado».
-- =============================================================

alter table public.transactions add column client_id uuid;

create unique index transactions_user_client_id_key
  on public.transactions (user_id, client_id)
  where client_id is not null;
