import { createClient } from '@/lib/supabase/server'
import { computeDueDates } from '@/lib/recurring'
import { formatMonthYear } from '@/lib/format'
import { formatCents } from '@/lib/money'
import { addDays, addMonths, eachDayOfInterval, format, parseISO, startOfMonth } from 'date-fns'

/** Movimiento de efectivo de una cuenta: importe con signo en céntimos y su fecha. */
export type CashMovement = { date: string; cents: number }

/** Día 1 del mes siguiente a `date` (yyyy-MM-dd): el primer abono de intereses. */
export function firstOfNextMonth(date: string): string {
  return format(startOfMonth(addMonths(parseISO(date), 1)), 'yyyy-MM-dd')
}

/** Mes que paga un abono: del día 1 al último día del mes anterior a `paymentDate`. */
export function interestPeriod(paymentDate: string): { start: string; end: string } {
  const payment = startOfMonth(parseISO(paymentDate))
  return {
    start: format(addMonths(payment, -1), 'yyyy-MM-dd'),
    end: format(addDays(payment, -1), 'yyyy-MM-dd'),
  }
}

/** Base de cálculo de los bancos en España: el % anual se reparte entre 365 días. */
export const DAYS_PER_YEAR = 365

/**
 * Retención de IRPF sobre los intereses de cuentas (rendimientos del capital mobiliario).
 * En España es un 19 % fijo, y el banco abona el neto.
 */
export const INTEREST_WITHHOLDING_PERCENT = 19

/**
 * Interés BRUTO de un mes, devengado día a día como hacen los bancos:
 * Σ (saldo de cierre de cada día) × % anual ÷ 365, redondeado al céntimo.
 * (Antes se usaba saldo medio × % ÷ 12, que no cuadra con lo que paga el banco: un mes
 * de 31 días devenga 31/365 del año, no 1/12.)
 * Los días con saldo negativo y los anteriores a `openedOn` (la cuenta aún no existía)
 * cuentan como 0. Los movimientos posteriores al periodo se ignoran.
 */
export function monthlyInterestCents({
  paymentDate,
  ratePercent,
  initialCents,
  movements,
  openedOn,
}: {
  paymentDate: string
  ratePercent: number
  initialCents: number
  movements: CashMovement[]
  openedOn?: string
}): number {
  const { start, end } = interestPeriod(paymentDate)
  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) }).map((d) =>
    format(d, 'yyyy-MM-dd')
  )

  let balance = initialCents
  for (const m of movements) {
    if (m.date < start) balance += m.cents
  }

  let sum = 0
  for (const day of days) {
    for (const m of movements) {
      if (m.date === day) balance += m.cents
    }
    if (openedOn && day < openedOn) continue
    sum += Math.max(balance, 0)
  }

  return Math.round((sum * ratePercent) / 100 / DAYS_PER_YEAR)
}

/**
 * Del bruto al neto: la retención se redondea hacia arriba al céntimo, como en los
 * extractos (13,76 € × 19 % = 2,6144 € → 2,62 €; neto 11,14 €).
 */
export function applyWithholding(
  grossCents: number,
  withholdingPercent = INTEREST_WITHHOLDING_PERCENT
): { grossCents: number; taxCents: number; netCents: number } {
  if (grossCents <= 0) return { grossCents: 0, taxCents: 0, netCents: 0 }
  // El -1e-9 evita que el ruido de coma flotante suba un céntimo un resultado exacto.
  const taxCents = Math.ceil((grossCents * withholdingPercent) / 100 - 1e-9)
  return { grossCents, taxCents, netCents: grossCents - taxCents }
}

/**
 * Abonos pendientes de una cuenta, en orden, con bruto, retención y neto. Lo que entra
 * en la cuenta es el neto, y es lo que se suma al saldo de los meses siguientes (interés
 * compuesto), por si la app lleva varios meses sin abrirse.
 */
export function computeInterestPayments({
  nextDate,
  today,
  ratePercent,
  initialCents,
  movements,
  openedOn,
}: {
  nextDate: string
  today: string
  ratePercent: number
  initialCents: number
  movements: CashMovement[]
  openedOn?: string
}): { payments: InterestPayment[]; next: string } {
  const { dates, next } = computeDueDates(nextDate, 'monthly', today, 1)
  const all = [...movements]
  const payments = dates.map((date) => {
    const gross = monthlyInterestCents({
      paymentDate: date,
      ratePercent,
      initialCents,
      movements: all,
      openedOn,
    })
    const { grossCents, taxCents, netCents } = applyWithholding(gross)
    all.push({ date, cents: netCents })
    return { date, grossCents, taxCents, cents: netCents }
  })
  return { payments, next }
}

/** Un abono: `cents` es el neto que entra en la cuenta. */
export type InterestPayment = { date: string; grossCents: number; taxCents: number; cents: number }

/** «Intereses de octubre de 2026 · 13,76 € brutos − 2,62 € de retención (19 %)». */
export function interestDescription(payment: InterestPayment): string {
  const month = formatMonthYear(parseISO(interestPeriod(payment.date).start))
  if (payment.taxCents === 0) return `Intereses de ${month}`
  return `Intereses de ${month} · ${formatCents(payment.grossCents)} brutos − ${formatCents(payment.taxCents)} de retención (${INTEREST_WITHHOLDING_PERCENT} %)`
}

/** Categoría de ingreso "Intereses" del usuario; si no existe, se crea. */
async function interestCategoryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('type', 'income')
    .ilike('name', 'intereses')
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: 'Intereses', type: 'income' })
    .select('id')
    .single()
  return created?.id ?? null
}

/**
 * Abona los intereses vencidos de las cuentas remuneradas (interest_rate) como ingresos.
 * Se llama en cada carga de página autenticada, como los recurrentes: si no hay ningún
 * abono vencido, la consulta no devuelve filas y no hace nada más.
 */
export async function processAccountInterest(userId: string) {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, currency, initial_balance_cents, interest_rate, interest_next_date, created_at')
    .not('interest_rate', 'is', null)
    .lte('interest_next_date', today)

  if (!accounts?.length) return

  const categoryId = await interestCategoryId(supabase, userId)
  if (!categoryId) return

  for (const account of accounts) {
    if (!account.interest_rate || !account.interest_next_date) continue
    const previousNext = account.interest_next_date
    const { dates, next } = computeDueDates(previousNext, 'monthly', today, 1)
    if (dates.length === 0) continue
    const lastPayment = dates[dates.length - 1]

    // Se reserva el periodo antes de abonar: si dos cargas de página coinciden,
    // solo una consigue mover la fecha y la otra no duplica los intereses.
    const { data: claimed } = await supabase
      .from('accounts')
      .update({ interest_next_date: next })
      .eq('id', account.id)
      .eq('interest_next_date', previousNext)
      .select('id')
    if (!claimed?.length) continue

    const [{ data: transactions }, { data: operations }] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount_cents, transaction_date')
        .eq('account_id', account.id)
        .is('deleted_at', null)
        .lt('transaction_date', lastPayment),
      // Compras y ventas que mueven el efectivo de una cuenta de inversión (como en account_balances).
      supabase
        .from('holding_operations')
        .select('operation_date, kind, amount_cents, holdings!inner(account_id)')
        .eq('holdings.account_id', account.id)
        .eq('affects_cash', true)
        .lt('operation_date', lastPayment),
    ])

    const movements: CashMovement[] = [
      ...(transactions ?? []).map((t) => ({ date: t.transaction_date, cents: t.amount_cents })),
      ...(operations ?? []).map((o) => ({
        date: o.operation_date,
        cents: o.kind === 'sell' ? o.amount_cents : -o.amount_cents,
      })),
    ]

    const { payments } = computeInterestPayments({
      nextDate: previousNext,
      today,
      ratePercent: Number(account.interest_rate),
      initialCents: account.initial_balance_cents,
      movements,
      openedOn: account.created_at.slice(0, 10),
    })

    const rows = payments
      .filter((p) => p.cents > 0)
      .map((p) => ({
        user_id: userId,
        account_id: account.id,
        category_id: categoryId,
        amount_cents: p.cents,
        currency: account.currency,
        description: interestDescription(p),
        transaction_date: p.date,
      }))
    if (rows.length === 0) continue

    const { error } = await supabase.from('transactions').insert(rows)
    if (error) {
      // Se devuelve la fecha para reintentarlo en la siguiente carga.
      await supabase
        .from('accounts')
        .update({ interest_next_date: previousNext })
        .eq('id', account.id)
    }
  }
}
