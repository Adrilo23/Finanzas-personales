import { createClient } from '@/lib/supabase/server'
import { applyCategorySign } from '@/lib/money'
import { addWeeks, addMonths, addYears, format, parseISO } from 'date-fns'

export type Frequency = 'weekly' | 'monthly' | 'yearly'

export function isSupportedFrequency(value: string): value is Frequency {
  return value === 'weekly' || value === 'monthly' || value === 'yearly'
}

function addPeriods(date: Date, frequency: Frequency, n: number): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(date, n)
    case 'monthly':
      return addMonths(date, n)
    case 'yearly':
      return addYears(date, n)
  }
}

/**
 * Fechas (yyyy-MM-dd) que han vencido desde `nextRunDate` hasta `today`, ambos incluidos,
 * y la siguiente fecha pendiente. Cada fecha se calcula desde la inicial (inicio + n
 * periodos) y no encadenando, para que un día 31 no derive a 28 tras pasar por febrero
 * dentro de una misma generación.
 */
export function computeDueDates(
  nextRunDate: string,
  frequency: Frequency,
  today: string
): { dates: string[]; next: string } {
  const start = parseISO(nextRunDate)
  const dates: string[] = []
  let n = 0
  let cursor = format(start, 'yyyy-MM-dd')
  while (cursor <= today) {
    dates.push(cursor)
    n += 1
    cursor = format(addPeriods(start, frequency, n), 'yyyy-MM-dd')
  }
  return { dates, next: cursor }
}

type DueRule = {
  id: string
  account_id: string
  category_id: string
  amount_cents: number
  frequency: string
  next_run_date: string
  categories: { type: string }[] | { type: string } | null
}

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

/**
 * Genera todos los movimientos pendientes de las reglas recurrentes activas
 * cuya next_run_date ya haya pasado, avanzando la fecha tantas veces como
 * haga falta (por si el usuario no ha abierto la app en un tiempo).
 * Se llama en cada carga de página autenticada; si no hay nada vencido,
 * la consulta no devuelve filas y no hace ningún trabajo extra.
 */
export async function processRecurringRules(userId: string) {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('recurring_rules')
    .select('id, account_id, category_id, amount_cents, frequency, next_run_date, categories(type)')
    .eq('active', true)
    .lte('next_run_date', today)

  const dueRules = (data ?? []) as DueRule[]
  if (dueRules.length === 0) return

  for (const rule of dueRules) {
    if (!isSupportedFrequency(rule.frequency)) continue

    const signedCents = applyCategorySign(rule.amount_cents, first(rule.categories)?.type)
    const { dates: datesToInsert, next } = computeDueDates(rule.next_run_date, rule.frequency, today)

    if (datesToInsert.length === 0) continue

    await supabase.from('transactions').insert(
      datesToInsert.map((transaction_date) => ({
        user_id: userId,
        account_id: rule.account_id,
        category_id: rule.category_id,
        amount_cents: signedCents,
        currency: 'EUR',
        description: null,
        transaction_date,
        recurring_rule_id: rule.id,
      }))
    )

    await supabase
      .from('recurring_rules')
      .update({ next_run_date: next })
      .eq('id', rule.id)
  }
}
