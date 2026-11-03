import { createClient } from '@/lib/supabase/server'
import { centsToEuros } from '@/lib/money'
import { fetchAllRows } from '@/lib/fetch-all'
import { format, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

export type Row = {
  amount_cents: number
  transaction_date: string
  categories: { type: string }[] | { type: string } | null
}

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

/** Un punto de la gráfica de evolución: un mes o un año (`month` es la etiqueta). */
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

  // 12 meses pueden pasar de 1000 movimientos (límite por respuesta de PostgREST).
  const data = await fetchAllRows((start, end) =>
    supabase
      .from('transactions')
      .select('amount_cents, transaction_date, categories(type)')
      .is('deleted_at', null)
      .gte('transaction_date', from)
      .order('id')
      .range(start, end)
  )

  return aggregateMonthly(data as Row[], new Date())
}

/**
 * Parte pura de getMonthlyEvolution (sin base de datos), para poder testearla.
 * Agrupa por mes los últimos 12 meses respecto a `now` y devuelve totales en euros.
 */
export function aggregateMonthly(rows: Row[], now: Date): MonthlyPoint[] {
  const months: Record<string, MonthlyPoint> = {}
  for (let i = 11; i >= 0; i--) {
    const d = startOfMonth(subMonths(now, i))
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

  // Se suma en céntimos (enteros) y solo al final se pasa a euros para la gráfica.
  return Object.values(months).map((p) => ({
    ...p,
    ingresos: centsToEuros(p.ingresos),
    gastos: centsToEuros(p.gastos),
    inversion: centsToEuros(p.inversion),
    balance: centsToEuros(p.balance),
  }))
}

/** Totales por año de todo el histórico (consulta y delega en aggregateYearly). */
export async function getYearlyEvolution(): Promise<MonthlyPoint[]> {
  const supabase = await createClient()
  const data = await fetchAllRows((start, end) =>
    supabase
      .from('transactions')
      .select('amount_cents, transaction_date, categories(type)')
      .is('deleted_at', null)
      .order('id')
      .range(start, end)
  )
  return aggregateYearly(data as Row[], new Date())
}

/**
 * Parte pura de getYearlyEvolution: un punto por año, desde el del movimiento más
 * antiguo hasta el actual (los años intermedios sin movimientos, a 0). Totales en euros.
 */
export function aggregateYearly(rows: Row[], now: Date): MonthlyPoint[] {
  const current = now.getFullYear()
  const years = rows.map((r) => Number(r.transaction_date.slice(0, 4))).filter((y) => y <= current)
  const firstYear = years.length > 0 ? Math.min(...years) : current

  const points: Record<number, MonthlyPoint> = {}
  for (let y = firstYear; y <= current; y++) {
    points[y] = { month: String(y), ingresos: 0, gastos: 0, inversion: 0, balance: 0 }
  }

  for (const row of rows) {
    const point = points[Number(row.transaction_date.slice(0, 4))]
    if (!point) continue
    const category = first(row.categories)
    if (category?.type === 'income') point.ingresos += row.amount_cents
    else if (category?.type === 'expense') point.gastos += Math.abs(row.amount_cents)
    else if (category?.type === 'investment') point.inversion += Math.abs(row.amount_cents)
    point.balance += row.amount_cents
  }

  return Object.values(points).map((p) => ({
    ...p,
    ingresos: centsToEuros(p.ingresos),
    gastos: centsToEuros(p.gastos),
    inversion: centsToEuros(p.inversion),
    balance: centsToEuros(p.balance),
  }))
}
