import { addMonths, endOfMonth, format, isValid, parse, startOfMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { computeBudgetProgress, type BudgetProgress } from '@/lib/budgets'
import { percentChange, sumByType, type Totals } from '@/lib/stats'

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

type CategoryRef = { name: string; type: string; icon: string | null }

export type ReportTransaction = {
  category_id: string | null
  amount_cents: number
  description: string | null
  transaction_date: string
  categories: CategoryRef[] | CategoryRef | null
}

export type ReportBudget = Parameters<typeof computeBudgetProgress>[0][number]
export type ReportCategory = Parameters<typeof computeBudgetProgress>[2][number]

export type ReportContribution = {
  goal_id: string
  amount_cents: number
  savings_goals: { name: string }[] | { name: string } | null
}

export type CategorySpend = {
  name: string
  icon: string | null
  cents: number
  /** Fracción (0-1) sobre el gasto total del mes. */
  share: number
}

export type MonthlyReport = {
  /** 'yyyy-MM' */
  month: string
  totals: Totals
  previous: Totals
  balanceCents: number
  /** Balance / ingresos; null si no hubo ingresos. */
  savingsRate: number | null
  /** Variación porcentual respecto al mes anterior (null si no hay base). */
  changes: { income: number | null; expense: number | null; investment: number | null }
  topCategories: CategorySpend[]
  topExpenses: { description: string; category: string; date: string; cents: number }[]
  budgets: BudgetProgress[]
  goals: { name: string; netCents: number }[]
  /** Nº de movimientos del mes (sin contar traspasos, que no tienen categoría). */
  transactionCount: number
  hasData: boolean
}

/** 'yyyy-MM' → primer día de ese mes; si no es válido o es futuro, el mes de `now`. */
export function parseMonthParam(value: string | null | undefined, now: Date): Date {
  const current = startOfMonth(now)
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return current
  const parsed = parse(value, 'yyyy-MM', new Date(2000, 0, 1))
  if (!isValid(parsed) || parsed > current) return current
  return startOfMonth(parsed)
}

/** Parte pura (sin base de datos), para poder testearla. Todo en céntimos. */
export function computeMonthlyReport(
  month: Date,
  rows: ReportTransaction[],
  previousRows: ReportTransaction[],
  budgets: ReportBudget[],
  categories: ReportCategory[],
  contributions: ReportContribution[]
): MonthlyReport {
  const totals = sumByType(rows)
  const previous = sumByType(previousRows)
  const balanceCents = totals.income - totals.expense - totals.investment

  const byCategory = new Map<string, { name: string; icon: string | null; cents: number }>()
  const expenses: MonthlyReport['topExpenses'] = []
  for (const row of rows) {
    const category = first(row.categories)
    if (category?.type !== 'expense') continue
    const cents = Math.abs(row.amount_cents)
    const entry = byCategory.get(category.name) ?? { name: category.name, icon: category.icon, cents: 0 }
    entry.cents += cents
    byCategory.set(category.name, entry)
    expenses.push({
      description: row.description?.trim() || category.name,
      category: category.name,
      date: row.transaction_date,
      cents,
    })
  }

  const topCategories = [...byCategory.values()]
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 8)
    .map((c) => ({ ...c, share: totals.expense > 0 ? c.cents / totals.expense : 0 }))

  const goalNet = new Map<string, { name: string; netCents: number }>()
  for (const c of contributions) {
    const entry = goalNet.get(c.goal_id) ?? {
      name: first(c.savings_goals)?.name ?? 'Objetivo',
      netCents: 0,
    }
    entry.netCents += c.amount_cents
    goalNet.set(c.goal_id, entry)
  }

  return {
    month: format(month, 'yyyy-MM'),
    totals,
    previous,
    balanceCents,
    savingsRate: totals.income > 0 ? balanceCents / totals.income : null,
    changes: {
      income: percentChange(totals.income, previous.income),
      expense: percentChange(totals.expense, previous.expense),
      investment: percentChange(totals.investment, previous.investment),
    },
    topCategories,
    topExpenses: expenses.sort((a, b) => b.cents - a.cents).slice(0, 5),
    budgets: computeBudgetProgress(budgets, rows, categories),
    goals: [...goalNet.values()].filter((g) => g.netCents !== 0),
    transactionCount: rows.filter((r) => first(r.categories)).length,
    hasData: rows.length > 0,
  }
}

/** Mes anterior y siguiente (este último solo si no es futuro), para la navegación. */
export function adjacentMonths(month: Date, now: Date): { prev: string; next: string | null } {
  const next = addMonths(month, 1)
  return {
    prev: format(addMonths(month, -1), 'yyyy-MM'),
    next: next <= startOfMonth(now) ? format(next, 'yyyy-MM') : null,
  }
}

export async function getMonthlyReport(month: Date): Promise<MonthlyReport> {
  const supabase = await createClient()
  const day = (d: Date) => format(d, 'yyyy-MM-dd')
  const from = day(startOfMonth(month))
  const to = day(endOfMonth(month))
  const prevFrom = day(startOfMonth(addMonths(month, -1)))
  const prevTo = day(endOfMonth(addMonths(month, -1)))

  const txSelect = 'category_id, amount_cents, description, transaction_date, categories(name, type, icon)'

  const [{ data: rows }, { data: previousRows }, { data: budgets }, { data: categories }, { data: contributions }] =
    await Promise.all([
      supabase
        .from('transactions')
        .select(txSelect)
        .is('deleted_at', null)
        .gte('transaction_date', from)
        .lte('transaction_date', to),
      supabase
        .from('transactions')
        .select(txSelect)
        .is('deleted_at', null)
        .gte('transaction_date', prevFrom)
        .lte('transaction_date', prevTo),
      supabase
        .from('budgets')
        .select('id, category_id, amount_cents, categories(name, icon)')
        .order('created_at', { ascending: true }),
      supabase.from('categories').select('id, parent_id'),
      supabase
        .from('goal_contributions')
        .select('goal_id, amount_cents, savings_goals(name)')
        .gte('contribution_date', from)
        .lte('contribution_date', to),
    ])

  return computeMonthlyReport(
    month,
    rows ?? [],
    previousRows ?? [],
    budgets ?? [],
    categories ?? [],
    contributions ?? []
  )
}
