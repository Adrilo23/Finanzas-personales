import { createClient } from '@/lib/supabase/server'
import { addWeeks, addMonths, addYears, format, parseISO } from 'date-fns'

type Frequency = 'weekly' | 'monthly' | 'yearly'

function advance(date: Date, frequency: Frequency): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(date, 1)
    case 'monthly':
      return addMonths(date, 1)
    case 'yearly':
      return addYears(date, 1)
  }
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
    if (rule.frequency !== 'weekly' && rule.frequency !== 'monthly' && rule.frequency !== 'yearly') {
      continue
    }

    const category = first(rule.categories)
    const sign = category?.type === 'income' ? 1 : -1
    const signedCents = sign * Math.abs(rule.amount_cents)

    let cursor = parseISO(rule.next_run_date)
    const datesToInsert: string[] = []

    while (format(cursor, 'yyyy-MM-dd') <= today) {
      datesToInsert.push(format(cursor, 'yyyy-MM-dd'))
      cursor = advance(cursor, rule.frequency)
    }

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
      .update({ next_run_date: format(cursor, 'yyyy-MM-dd') })
      .eq('id', rule.id)
  }
}
