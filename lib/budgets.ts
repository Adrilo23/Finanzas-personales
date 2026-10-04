import { endOfMonth, format, startOfMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/server'

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export type BudgetStatus = 'ok' | 'warning' | 'over'

export type BudgetProgress = {
  id: string
  categoryId: string
  name: string
  icon: string | null
  budgetCents: number
  spentCents: number
  /** gastado / presupuesto, sin limitar a 1. */
  ratio: number
  status: BudgetStatus
}

/** A partir del 80 % se avisa; por encima del 100 %, superado. */
export const BUDGET_WARNING_RATIO = 0.8

function statusFor(ratio: number): BudgetStatus {
  if (ratio > 1) return 'over'
  if (ratio >= BUDGET_WARNING_RATIO) return 'warning'
  return 'ok'
}

/**
 * Progreso de cada presupuesto en el mes en curso. Lo gastado en una subcategoría
 * cuenta también para el presupuesto de su categoría padre.
 */
export async function getBudgetProgress(now = new Date()): Promise<BudgetProgress[]> {
  const supabase = await createClient()
  // Fechas locales con date-fns: toISOString() las pasaría a UTC y desplazaría el mes un día.
  const from = format(startOfMonth(now), 'yyyy-MM-dd')
  const to = format(endOfMonth(now), 'yyyy-MM-dd')

  const [{ data: budgets }, { data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from('budgets')
      .select('id, category_id, amount_cents, categories(name, icon)')
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('category_id, amount_cents, categories(type)')
      .is('deleted_at', null)
      .gte('transaction_date', from)
      .lte('transaction_date', to),
    supabase.from('categories').select('id, parent_id'),
  ])

  if (!budgets || budgets.length === 0) return []

  const parentOf = new Map((categories ?? []).map((c) => [c.id, c.parent_id]))

  const spentByCategory = new Map<string, number>()
  const add = (categoryId: string, cents: number) =>
    spentByCategory.set(categoryId, (spentByCategory.get(categoryId) ?? 0) + cents)

  for (const tx of transactions ?? []) {
    if (!tx.category_id || first(tx.categories)?.type !== 'expense') continue
    // Los gastos se guardan en negativo; el gasto real es el valor absoluto.
    const cents = Math.abs(tx.amount_cents)
    add(tx.category_id, cents)
    const parentId = parentOf.get(tx.category_id)
    if (parentId) add(parentId, cents)
  }

  return budgets.map((budget) => {
    const category = first(budget.categories)
    const spentCents = spentByCategory.get(budget.category_id) ?? 0
    const ratio = spentCents / budget.amount_cents
    return {
      id: budget.id,
      categoryId: budget.category_id,
      name: category?.name ?? 'Categoría',
      icon: category?.icon ?? null,
      budgetCents: budget.amount_cents,
      spentCents,
      ratio,
      status: statusFor(ratio),
    }
  })
}
