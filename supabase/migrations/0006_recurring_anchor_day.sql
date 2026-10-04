-- =============================================================
-- Migración 0006 — Día de referencia de los movimientos recurrentes
-- Sin él, una regla mensual del día 31 bajaba a 28 al pasar por febrero
-- y se quedaba en 28 para siempre (next_run_date era la única referencia).
-- anchor_day guarda el día original; cada vencimiento usa ese día, recortado
-- al último día del mes cuando el mes es más corto.
-- =============================================================

alter table public.recurring_rules
  add column anchor_day smallint check (anchor_day between 1 and 31);

-- Reglas existentes: el mejor dato disponible es el día de su próxima ejecución.
-- (Si alguna ya había derivado de 31 a 28, se queda en 28: no hay forma de saber el día original.)
update public.recurring_rules
  set anchor_day = extract(day from next_run_date)::smallint
  where anchor_day is null;

alter table public.recurring_rules
  alter column anchor_day set not null;
