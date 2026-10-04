type CategoryRef = { type: string } | { type: string }[] | null

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export type Totals = { income: number; expense: number; investment: number }

/**
 * Totales en céntimos por tipo de categoría. Gastos e inversión se devuelven en
 * positivo (valor absoluto); los movimientos sin categoría no cuentan.
 */
export function sumByType(rows: { amount_cents: number; categories: CategoryRef }[]): Totals {
  const totals: Totals = { income: 0, expense: 0, investment: 0 }
  for (const row of rows) {
    const category = first(row.categories)
    if (!category) continue
    if (category.type === 'income') totals.income += row.amount_cents
    else if (category.type === 'expense') totals.expense += Math.abs(row.amount_cents)
    else if (category.type === 'investment') totals.investment += Math.abs(row.amount_cents)
  }
  return totals
}

/** Variación porcentual; null si no hay base con la que comparar. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}
