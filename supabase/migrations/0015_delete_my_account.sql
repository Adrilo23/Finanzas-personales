-- =============================================================
-- Migración 0015 — Borrado de la propia cuenta (derecho de supresión, RGPD)
--
-- delete_my_account() borra al usuario autenticado de auth.users. Todas las tablas
-- con user_id lo referencian con «on delete cascade», así que se van con él. Los
-- archivos del bucket «attachments» no cascadean (son objetos de Storage): la Server
-- Action los elimina por la API antes de llamar a esta función.
-- =============================================================

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as
$$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  delete from auth.users where id = auth.uid();
end
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
