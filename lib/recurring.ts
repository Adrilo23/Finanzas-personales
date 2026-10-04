import { createClient } from '@/lib/supabase/server'
import { applyCategorySign } from '@/lib/money'
import {
  addMonths,
  addWeeks,
  addYears,
  format,
  getDate,
  getDaysInMonth,
  parseISO,
  setDate,
} from 'date-fns'

export type Frequency = 'weekly' | 'monthly' | 'yearly'

export function isSupportedFrequency(value: string): value is Frequency {
  return value === 'weekly' || value === 'monthly' || value === 'yearly'
}

/** Siguiente vencimiento tras `date`, respetando el día de referencia en mensual y anual. */
function nextOccurrence(date: Date, frequency: Frequency, anchorDay: number): Date {
  if (frequency === 'weekly') return addWeeks(date, 1)
  // addMonths/addYears recortan al último día del mes (31 ene + 1 mes = 28 feb); después se
  // recoloca en el día de referencia, para que el 28 de febrero vuelva a ser 31 en marzo.
  const moved = frequency === 'monthly' ? addMonths(date, 1) : addYears(date, 1)
  return setDate(moved, Math.min(anchorDay, getDaysInMonth(moved)))
}

/**
 * Fechas (yyyy-MM-dd) que han vencido desde `nextRunDate` hasta `today`, ambos incluidos,
 * y la siguiente fecha pendiente. `anchorDay` es el día del mes original de la regla
 * (columna anchor_day): un día 31 cae el 28/29 en febrero y vuelve al 31 en marzo.
 */
export function computeDueDates(
  nextRunDate: string,
  frequency: Frequency,
  today: string,
  anchorDay?: number
): { dates: string[]; next: string } {
  let cursor = parseISO(nextRunDate)
  const anchor = anchorDay ?? getDate(cursor)
  const dates: string[] = []
  while (format(cursor, 'yyyy-MM-dd') <= today) {
    dates.push(format(cursor, 'yyyy-MM-dd'))
    cursor = nextOccurrence(cursor, frequency, anchor)
  }
  return { dates, next: format(cursor, 'yyyy-MM-dd') }
}

type DueRule = {
  id: string
  account_id: string
  category_id: string
  amount_cents: number
  frequency: string
  next_run_date: string
  anchor_day: number
  to_account_id: string | null
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
    .select(
      'id, account_id, category_id, amount_cents, frequency, next_run_date, anchor_day, to_account_id, categories(type)'
    )
    .eq('active', true)
    .lte('next_run_date', today)

  const dueRules = (data ?? []) as DueRule[]
  if (dueRules.length === 0) return

  for (const rule of dueRules) {
    if (!isSupportedFrequency(rule.frequency)) continue

    const signedCents = applyCategorySign(rule.amount_cents, first(rule.categories)?.type)
    const { dates: datesToInsert, next } = computeDueDates(
      rule.next_run_date,
      rule.frequency,
      today,
      rule.anchor_day
    )

    if (datesToInsert.length === 0) continue

    // Traspaso (con o sin reparto en activos): lo genera la función SQL
    // run_contribution_plan de forma atómica, incluida la nueva fecha.
    if (rule.to_account_id) {
      await supabase.rpc('run_contribution_plan', {
        p_rule_id: rule.id,
        p_dates: datesToInsert,
        p_next: next,
      })
      continue
    }

    const { error } = await supabase.from('transactions').insert(
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
    // Si falla, no se adelanta la fecha: se reintentará en la siguiente carga.
    if (error) continue

    await supabase.from('recurring_rules').update({ next_run_date: next }).eq('id', rule.id)
  }
}
