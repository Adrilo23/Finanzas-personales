import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

type Row = {
  amount_cents: number
  transaction_date: string
  categories: { type: string }[] | { type: string } | null
}

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export type MonthlyPoint = {
  month: string
  ingresos: number
  gastos: number
  inversion: number
  balance: number
}

/**
 * Devuelve los últimos 12 meses (incluido el actual), con totales en euros.
 * Los meses sin movimientos aparecen igualmente con valores a 0, para que
 * la gráfica no tenga huecos.
 */
export async function getMonthlyEvolution(): Promise<MonthlyPoint[]> {
  const supabase = await createClient()
  const from = format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('transactions')
    .select('amount_cents, transaction_date, categories(type)')
    .is('deleted_at', null)
    .gte('transaction_date', from)

  const rows = (data ?? []) as Row[]

  const months: Record<string, MonthlyPoint> = {}
  for (let i = 11; i >= 0; i--) {
    const d = startOfMonth(subMonths(new Date(), i))
    const key = format(d, 'yyyy-MM')
    months[key] = {
      month: format(d, 'MMM yy', { locale: es }),
      ingresos: 0,
      gastos: 0,
      inversion: 0,
      balance: 0,
    }
  }

  for (const row of rows) {
    const key = row.transaction_date.slice(0, 7)
    const point = months[key]
    if (!point) continue

    const category = first(row.categories)
    if (category?.type === 'income') point.ingresos += row.amount_cents
    else if (category?.type === 'expense') point.gastos += Math.abs(row.amount_cents)
    else if (category?.type === 'investment') point.inversion += Math.abs(row.amount_cents)
    point.balance += row.amount_cents
  }

  return Object.values(months).map((p) => ({
    ...p,
    ingresos: p.ingresos / 100,
    gastos: p.gastos / 100,
    inversion: p.inversion / 100,
    balance: p.balance / 100,
  }))
}
