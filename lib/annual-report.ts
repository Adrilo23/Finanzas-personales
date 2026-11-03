import { format, subYears } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { percentChange, sumByType, type Totals } from '@/lib/stats'
import { fetchAllRows } from '@/lib/fetch-all'

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

type CategoryRef = { name: string; type: string; icon: string | null }

export type AnnualTransaction = {
  amount_cents: number
  description: string | null
  transaction_date: string
  categories: CategoryRef[] | CategoryRef | null
}

export type AnnualContribution = {
  goal_id: string
  amount_cents: number
  savings_goals: { name: string }[] | { name: string } | null
}

export type AnnualMonth = {
  /** 'yyyy-MM' */
  key: string
  /** 'ene', 'feb'… */
  label: string
  income: number
  expense: number
  investment: number
  balance: number
}

export type AnnualCategory = {
  name: string
  icon: string | null
  cents: number
  previousCents: number
  /** Variación porcentual frente al año anterior (null si entonces no hubo gasto). */
  change: number | null
  /** Fracción (0-1) sobre el gasto total del año. */
  share: number
}

export type AnnualReport = {
  year: number
  /** Año en curso: se compara con el mismo periodo del año anterior, no con el año entero. */
  partial: boolean
  /** Último día incluido ('yyyy-MM-dd'): 31 dic, u hoy si el año está en curso. */
  through: string
  totals: Totals
  previous: Totals
  balanceCents: number
  previousBalanceCents: number
  savingsRate: number | null
  previousSavingsRate: number | null
  changes: {
    income: number | null
    expense: number | null
    investment: number | null
    balance: number | null
  }
  months: AnnualMonth[]
  categories: AnnualCategory[]
  topExpenses: { description: string; category: string; date: string; cents: number }[]
  goals: { name: string; netCents: number }[]
  hasData: boolean
}

/** Año válido (2000 … año actual); si no, el año en curso. */
export function parseYearParam(value: string | null | undefined, now: Date): number {
  const current = now.getFullYear()
  if (!value || !/^\d{4}$/.test(value)) return current
  const year = Number(value)
  return year >= 2000 && year <= current ? year : current
}

export function adjacentYears(year: number, now: Date): { prev: number; next: number | null } {
  return { prev: year - 1, next: year < now.getFullYear() ? year + 1 : null }
}

/**
 * Rango del año y del periodo con el que se compara. En el año en curso se compara
 * hasta el mismo día del año anterior (1 ene – 3 nov 2025 frente a 1 ene – 3 nov 2026).
 */
export function annualRanges(year: number, now: Date) {
  const partial = year === now.getFullYear()
  const through = partial ? format(now, 'yyyy-MM-dd') : `${year}-12-31`
  return {
    partial,
    from: `${year}-01-01`,
    through,
    previousFrom: `${year - 1}-01-01`,
    previousThrough: partial ? format(subYears(now, 1), 'yyyy-MM-dd') : `${year - 1}-12-31`,
  }
}

const balanceOf = (t: Totals) => t.income - t.expense - t.investment

/** Parte pura (sin base de datos), para poder testearla. Todo en céntimos. */
export function computeAnnualReport(
  year: number,
  now: Date,
  rows: AnnualTransaction[],
  previousRows: AnnualTransaction[],
  contributions: AnnualContribution[]
): AnnualReport {
  const { partial, through } = annualRanges(year, now)
  const totals = sumByType(rows)
  const previous = sumByType(previousRows)
  const balanceCents = balanceOf(totals)
  const previousBalanceCents = balanceOf(previous)

  // Los 12 meses, aunque no tengan movimientos (o sean futuros), para la tabla.
  const months: AnnualMonth[] = Array.from({ length: 12 }, (_, i) => ({
    key: `${year}-${String(i + 1).padStart(2, '0')}`,
    label: format(new Date(year, i, 1), 'MMM', { locale: es }).replace('.', ''),
    income: 0,
    expense: 0,
    investment: 0,
    balance: 0,
  }))

  const byCategory = new Map<string, AnnualCategory>()
  const entry = (c: CategoryRef) => {
    const found = byCategory.get(c.name)
    if (found) return found
    const created = { name: c.name, icon: c.icon, cents: 0, previousCents: 0, change: null, share: 0 }
    byCategory.set(c.name, created)
    return created
  }

  const expenses: AnnualReport['topExpenses'] = []
  for (const row of rows) {
    const category = first(row.categories)
    if (!category) continue
    const month = months[Number(row.transaction_date.slice(5, 7)) - 1]
    if (!month) continue
    const cents = Math.abs(row.amount_cents)
    if (category.type === 'income') month.income += row.amount_cents
    else if (category.type === 'expense') month.expense += cents
    else if (category.type === 'investment') month.investment += cents

    if (category.type !== 'expense') continue
    entry(category).cents += cents
    expenses.push({
      description: row.description?.trim() || category.name,
      category: category.name,
      date: row.transaction_date,
      cents,
    })
  }
  for (const m of months) m.balance = m.income - m.expense - m.investment

  for (const row of previousRows) {
    const category = first(row.categories)
    if (category?.type !== 'expense') continue
    entry(category).previousCents += Math.abs(row.amount_cents)
  }

  const categories = [...byCategory.values()]
    .map((c) => ({
      ...c,
      change: percentChange(c.cents, c.previousCents),
      share: totals.expense > 0 ? c.cents / totals.expense : 0,
    }))
    .sort((a, b) => b.cents - a.cents || b.previousCents - a.previousCents)

  const goalNet = new Map<string, { name: string; netCents: number }>()
  for (const c of contributions) {
    const g = goalNet.get(c.goal_id) ?? { name: first(c.savings_goals)?.name ?? 'Objetivo', netCents: 0 }
    g.netCents += c.amount_cents
    goalNet.set(c.goal_id, g)
  }

  return {
    year,
    partial,
    through,
    totals,
    previous,
    balanceCents,
    previousBalanceCents,
    savingsRate: totals.income > 0 ? balanceCents / totals.income : null,
    previousSavingsRate: previous.income > 0 ? previousBalanceCents / previous.income : null,
    changes: {
      income: percentChange(totals.income, previous.income),
      expense: percentChange(totals.expense, previous.expense),
      investment: percentChange(totals.investment, previous.investment),
      // Con base negativa el % engaña (de −100 a +100 sería −200 %): solo si era positiva.
      balance: previousBalanceCents > 0 ? percentChange(balanceCents, previousBalanceCents) : null,
    },
    months,
    categories,
    topExpenses: expenses.sort((a, b) => b.cents - a.cents).slice(0, 10),
    goals: [...goalNet.values()].filter((g) => g.netCents !== 0),
    hasData: rows.length > 0,
  }
}

export async function getAnnualReport(year: number, now = new Date()): Promise<AnnualReport> {
  const supabase = await createClient()
  const r = annualRanges(year, now)
  const select = 'amount_cents, description, transaction_date, categories(name, type, icon)'

  // Un año puede tener más de 1000 movimientos (límite por respuesta de PostgREST).
  const yearRows = (from: string, through: string) =>
    fetchAllRows((start, end) =>
      supabase
        .from('transactions')
        .select(select)
        .is('deleted_at', null)
        .gte('transaction_date', from)
        .lte('transaction_date', through)
        .order('id')
        .range(start, end)
    )

  const [rows, previousRows, { data: contributions }] = await Promise.all([
    yearRows(r.from, r.through),
    yearRows(r.previousFrom, r.previousThrough),
    supabase
      .from('goal_contributions')
      .select('goal_id, amount_cents, savings_goals(name)')
      .gte('contribution_date', r.from)
      .lte('contribution_date', r.through),
  ])

  return computeAnnualReport(year, now, rows, previousRows, contributions ?? [])
}
