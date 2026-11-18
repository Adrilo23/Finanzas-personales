import { createClient } from '@/lib/supabase/server'
import { centsToEuros } from '@/lib/money'
import { fetchAllRows } from '@/lib/fetch-all'
import { endOfMonth, format, getDaysInMonth, startOfMonth, subMonths } from 'date-fns'
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
  /** Etiqueta corta del eje X, si la de `month` es demasiado larga (p. ej. el día). */
  axis?: string
  /** Periodo que representa (`yyyy-MM` o `yyyy-MM-dd`), para enlazar a su informe. */
  period?: string
  ingresos: number
  gastos: number
  inversion: number
  balance: number
}

/**
 * Agrupa por mes los últimos 12 meses respecto a `now` (incluido el actual, los
 * vacíos a 0) y devuelve totales en euros. Ya no la usa la pantalla Evolución,
 * pero sí la demo pública.
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

type Bucket = { ingresos: number; gastos: number; inversion: number; balance: number }

const emptyBucket = (): Bucket => ({ ingresos: 0, gastos: 0, inversion: 0, balance: 0 })

function addRow(point: Bucket, row: Row) {
  const category = first(row.categories)
  if (category?.type === 'income') point.ingresos += row.amount_cents
  else if (category?.type === 'expense') point.gastos += Math.abs(row.amount_cents)
  else if (category?.type === 'investment') point.inversion += Math.abs(row.amount_cents)
  point.balance += row.amount_cents
}

/** Pasa un cubo en céntimos a euros (se suma en enteros y se convierte al final). */
function toEuros(p: Bucket): Bucket {
  return {
    ingresos: centsToEuros(p.ingresos),
    gastos: centsToEuros(p.gastos),
    inversion: centsToEuros(p.inversion),
    balance: centsToEuros(p.balance),
  }
}

async function fetchRange(from: string, to: string): Promise<Row[]> {
  const supabase = await createClient()
  const data = await fetchAllRows((start, end) =>
    supabase
      .from('transactions')
      .select('amount_cents, transaction_date, categories(type)')
      .is('deleted_at', null)
      .gte('transaction_date', from)
      .lte('transaction_date', to)
      .order('id')
      .range(start, end)
  )
  return data as Row[]
}

/** Un mes día a día (consulta y delega en aggregateDaily). */
export async function getDailyEvolution(month: Date, now: Date = new Date()): Promise<MonthlyPoint[]> {
  const rows = await fetchRange(
    format(startOfMonth(month), 'yyyy-MM-dd'),
    format(endOfMonth(month), 'yyyy-MM-dd')
  )
  return aggregateDaily(rows, month, now)
}

/**
 * Parte pura de getDailyEvolution: un punto por día del mes. En el mes en curso llega
 * hasta hoy (no pinta días que aún no han pasado). Totales en euros.
 */
export function aggregateDaily(rows: Row[], month: Date, now: Date): MonthlyPoint[] {
  const key = format(month, 'yyyy-MM')
  const days = key === format(now, 'yyyy-MM') ? now.getDate() : getDaysInMonth(month)

  const points: Bucket[] = Array.from({ length: days }, emptyBucket)
  for (const row of rows) {
    if (row.transaction_date.slice(0, 7) !== key) continue
    const point = points[Number(row.transaction_date.slice(8, 10)) - 1]
    if (point) addRow(point, row)
  }

  return points.map((p, i) => {
    const date = new Date(month.getFullYear(), month.getMonth(), i + 1)
    return {
      month: format(date, "d 'de' MMMM", { locale: es }),
      axis: String(i + 1),
      period: format(date, 'yyyy-MM-dd'),
      ...toEuros(p),
    }
  })
}

/** Los meses de un año (consulta y delega en aggregateYearMonths). */
export async function getYearMonthsEvolution(year: number, now: Date = new Date()): Promise<MonthlyPoint[]> {
  const rows = await fetchRange(`${year}-01-01`, `${year}-12-31`)
  return aggregateYearMonths(rows, year, now)
}

/**
 * Parte pura de getYearMonthsEvolution: un punto por mes del año. En el año en curso
 * llega hasta el mes actual; los meses sin movimientos salen a 0. Totales en euros.
 */
export function aggregateYearMonths(rows: Row[], year: number, now: Date): MonthlyPoint[] {
  const months = year === now.getFullYear() ? now.getMonth() + 1 : 12

  const points: Bucket[] = Array.from({ length: months }, emptyBucket)
  for (const row of rows) {
    if (Number(row.transaction_date.slice(0, 4)) !== year) continue
    const point = points[Number(row.transaction_date.slice(5, 7)) - 1]
    if (point) addRow(point, row)
  }

  return points.map((p, i) => {
    const date = new Date(year, i, 1)
    return {
      month: format(date, 'MMMM', { locale: es }),
      axis: format(date, 'MMM', { locale: es }),
      period: format(date, 'yyyy-MM'),
      ...toEuros(p),
    }
  })
}
