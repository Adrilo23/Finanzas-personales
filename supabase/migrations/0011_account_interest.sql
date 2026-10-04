-- =============================================================
-- 0011 · Cuentas remuneradas
-- Cualquier cuenta puede tener, de forma opcional, un interés anual (p. ej. 3 %).
-- Cada mes, el día 1, se abona como ingreso el interés del mes anterior:
-- saldo medio diario de efectivo × % anual ÷ 12 (lib/interest.ts).
-- interest_next_date es el próximo abono pendiente; la generación es perezosa,
-- como la de los recurrentes.
-- =============================================================

alter table public.accounts
  add column interest_rate numeric(6, 3)
    check (interest_rate > 0 and interest_rate <= 100),
  add column interest_next_date date,
  add constraint accounts_interest_complete
    check ((interest_rate is null) = (interest_next_date is null));
