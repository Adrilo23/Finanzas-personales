import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { computeBudgetProgress, type BudgetProgress } from '@/lib/budgets'
import { computeGoals, type GoalProgress } from '@/lib/goals'
import { aggregateMonthly, type MonthlyPoint } from '@/lib/reports'
import { sumByType, type Totals } from '@/lib/stats'

/*
 * Datos de ejemplo para la demo pública (/demo) y la landing. Son ficticios y se
 * presentan como tales. No tocan Supabase: se generan de forma determinista y pasan
 * por las mismas funciones puras que la app (sumByType, computeBudgetProgress,
 * computeGoals, aggregateMonthly), así que lo que se ve es lo que la app calcularía.
 *
 * La demo muestra el último mes completo: a principios de mes el mes en curso tendría
 * tres apuntes y no enseñaría nada.
 */

type CategoryType = 'income' | 'expense' | 'investment'

export type DemoCategory = {
  id: string
  name: string
  type: CategoryType
  icon: string | null
  parent_id: string | null
}

export type DemoTransaction = {
  id: string
  category_id: string
  amount_cents: number
  description: string
  transaction_date: string
  account: string
  categories: { name: string; type: string; icon: string | null }
}

export type DemoAccount = { id: string; name: string; type: string; balance_cents: number }

const CATEGORIES: DemoCategory[] = [
  { id: 'nomina', name: 'Nómina', type: 'income', icon: '💼', parent_id: null },
  { id: 'alquiler', name: 'Alquiler', type: 'expense', icon: '🏠', parent_id: null },
  { id: 'alimentacion', name: 'Alimentación', type: 'expense', icon: '🛒', parent_id: null },
  { id: 'supermercado', name: 'Supermercado', type: 'expense', icon: '🧺', parent_id: 'alimentacion' },
  { id: 'restaurantes', name: 'Restaurantes', type: 'expense', icon: '🍽️', parent_id: 'alimentacion' },
  { id: 'suministros', name: 'Suministros', type: 'expense', icon: '💡', parent_id: null },
  { id: 'transporte', name: 'Transporte', type: 'expense', icon: '🚇', parent_id: null },
  { id: 'ocio', name: 'Ocio', type: 'expense', icon: '🎬', parent_id: null },
  { id: 'salud', name: 'Salud', type: 'expense', icon: '💊', parent_id: null },
  { id: 'fondo', name: 'Fondo indexado', type: 'investment', icon: '📈', parent_id: null },
]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

/** Apuntes de un mes tipo: día, categoría, importe base en céntimos (positivo), concepto. */
const MONTH_TEMPLATE: [number, string, number, string, string][] = [
  [1, 'alquiler', 75000, 'Alquiler piso', 'Cuenta nómina'],
  [2, 'nomina', 185000, 'Nómina', 'Cuenta nómina'],
  [3, 'supermercado', 6240, 'Mercadona', 'Tarjeta'],
  [6, 'transporte', 2180, 'Abono transporte', 'Tarjeta'],
  [8, 'suministros', 5420, 'Factura de la luz', 'Cuenta nómina'],
  [10, 'supermercado', 4875, 'Supermercado', 'Tarjeta'],
  [12, 'restaurantes', 3850, 'Cena con amigos', 'Tarjeta'],
  [14, 'ocio', 1800, 'Cine', 'Efectivo'],
  [17, 'supermercado', 7130, 'Mercadona', 'Tarjeta'],
  [19, 'fondo', 15000, 'Aportación al fondo', 'Cuenta nómina'],
  [21, 'salud', 1235, 'Farmacia', 'Efectivo'],
  [23, 'restaurantes', 2290, 'Menú del día', 'Tarjeta'],
  [24, 'supermercado', 5560, 'Supermercado', 'Tarjeta'],
  [26, 'ocio', 4500, 'Concierto', 'Tarjeta'],
  [28, 'suministros', 3500, 'Internet y móvil', 'Cuenta nómina'],
]

/** Variación determinista (±8 %) por mes y día, para que los meses no sean idénticos. */
function vary(cents: number, monthIndex: number, day: number, fixed: boolean): number {
  if (fixed) return cents
  const step = ((monthIndex * 7 + day * 3) % 5) - 2
  return Math.round(cents * (1 + step * 0.04))
}

const FIXED = new Set(['alquiler', 'nomina', 'fondo', 'transporte'])

/** Lo que hace que un año no sea doce meses iguales (clave: mes 0-11). */
const SEASONAL: Record<number, [number, string, number, string, string][]> = {
  5: [[30, 'nomina', 185000, 'Paga extra de verano', 'Cuenta nómina']],
  6: [[15, 'ocio', 9500, 'Festival', 'Tarjeta']],
  7: [
    [5, 'ocio', 42000, 'Vacaciones', 'Tarjeta'],
    [9, 'restaurantes', 8600, 'Cenas de vacaciones', 'Tarjeta'],
  ],
  11: [
    [20, 'nomina', 185000, 'Paga extra de Navidad', 'Cuenta nómina'],
    [22, 'ocio', 21000, 'Regalos de Navidad', 'Tarjeta'],
    [24, 'supermercado', 9800, 'Compra de Nochebuena', 'Tarjeta'],
  ],
  0: [[12, 'ocio', 6500, 'Rebajas', 'Tarjeta']],
}

/** Mes de referencia de la demo: el último mes completo respecto a `now`. */
export function demoMonth(now: Date): Date {
  return startOfMonth(subMonths(now, 1))
}

/** Doce meses de apuntes que acaban en el mes de referencia. */
export function demoTransactions(now: Date): DemoTransaction[] {
  const reference = demoMonth(now)
  const rows: DemoTransaction[] = []
  for (let back = 11; back >= 0; back--) {
    const month = subMonths(reference, back)
    const lastDay = endOfMonth(month).getDate()
    const entries = [...MONTH_TEMPLATE, ...(SEASONAL[month.getMonth()] ?? [])].filter(([, , base]) => base > 0)
    for (const [day, categoryId, base, description, account] of entries) {
      const category = byId.get(categoryId)!
      const cents = vary(base, back, day, FIXED.has(categoryId))
      const date = new Date(month.getFullYear(), month.getMonth(), Math.min(day, lastDay))
      rows.push({
        id: `${format(month, 'yyyy-MM')}-${day}-${categoryId}-${description}`,
        category_id: categoryId,
        amount_cents: category.type === 'income' ? cents : -cents,
        description,
        transaction_date: format(date, 'yyyy-MM-dd'),
        account,
        categories: { name: category.name, type: category.type, icon: category.icon },
      })
    }
  }
  return rows
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: 'nomina', name: 'Cuenta nómina', type: 'bank', balance_cents: 284_350 },
  { id: 'tarjeta', name: 'Tarjeta', type: 'card', balance_cents: -31_240 },
  { id: 'efectivo', name: 'Efectivo', type: 'cash', balance_cents: 8_520 },
  { id: 'broker', name: 'Bróker', type: 'investment', balance_cents: 412_880 },
]

const BUDGETS = [
  // Un presupuesto superado, uno cerca del límite y dos holgados: se ven los tres estados.
  { id: 'b-alimentacion', category_id: 'alimentacion', amount_cents: 32_000 },
  { id: 'b-ocio', category_id: 'ocio', amount_cents: 6_000 },
  { id: 'b-suministros', category_id: 'suministros', amount_cents: 15_000 },
  { id: 'b-salud', category_id: 'salud', amount_cents: 4_000 },
]

export type DemoData = {
  month: Date
  totals: Totals
  previous: Totals
  balanceCents: number
  monthRows: DemoTransaction[]
  recent: DemoTransaction[]
  accounts: DemoAccount[]
  netWorthCents: number
  budgets: BudgetProgress[]
  goals: GoalProgress[]
  evolution: MonthlyPoint[]
  categorySpend: { name: string; icon: string | null; cents: number }[]
}

/** Todo lo que pinta la demo, calculado con las funciones de la app. */
export function buildDemo(now: Date): DemoData {
  const month = demoMonth(now)
  const monthKey = format(month, 'yyyy-MM')
  const previousKey = format(subMonths(month, 1), 'yyyy-MM')
  const all = demoTransactions(now)
  const monthRows = all.filter((t) => t.transaction_date.startsWith(monthKey))
  const previousRows = all.filter((t) => t.transaction_date.startsWith(previousKey))

  const totals = sumByType(monthRows)
  const previous = sumByType(previousRows)

  const budgets = computeBudgetProgress(
    BUDGETS.map((b) => {
      const c = byId.get(b.category_id)!
      return { ...b, categories: { name: c.name, icon: c.icon } }
    }),
    monthRows,
    CATEGORIES.map((c) => ({ id: c.id, parent_id: c.parent_id }))
  )

  // Objetivos con aportaciones manuales repartidas en los últimos meses.
  const endOfReference = endOfMonth(month)
  const contributions = Array.from({ length: 6 }, (_, i) => {
    const date = format(endOfMonth(subMonths(month, i)), 'yyyy-MM-dd')
    return [
      { goal_id: 'g-emergencia', amount_cents: 20_000, contribution_date: date },
      { goal_id: 'g-viaje', amount_cents: 25_000, contribution_date: date },
    ]
  }).flat()
  const goals = computeGoals(
    [
      { id: 'g-emergencia', name: 'Fondo de emergencia', icon: '🛟', target_cents: 600_000, target_date: null },
      {
        id: 'g-viaje',
        name: 'Viaje a Japón',
        icon: '✈️',
        target_cents: 350_000,
        target_date: format(endOfMonth(subMonths(month, -8)), 'yyyy-MM-dd'),
      },
    ],
    [
      ...contributions,
      { goal_id: 'g-emergencia', amount_cents: 180_000, contribution_date: format(subMonths(month, 10), 'yyyy-MM-dd') },
    ],
    endOfReference
  )

  const spend = new Map<string, { name: string; icon: string | null; cents: number }>()
  for (const t of monthRows) {
    if (t.categories.type !== 'expense') continue
    // Como en el inicio de la app: por categoría registrada (las subcategorías aparte).
    const entry = spend.get(t.categories.name) ?? { name: t.categories.name, icon: t.categories.icon, cents: 0 }
    entry.cents += Math.abs(t.amount_cents)
    spend.set(t.categories.name, entry)
  }

  return {
    month,
    totals,
    previous,
    balanceCents: totals.income - totals.expense - totals.investment,
    monthRows,
    recent: [...monthRows].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)).slice(0, 6),
    accounts: DEMO_ACCOUNTS,
    netWorthCents: DEMO_ACCOUNTS.reduce((sum, a) => sum + a.balance_cents, 0),
    budgets,
    goals,
    evolution: aggregateMonthly(all, endOfReference),
    categorySpend: [...spend.values()].sort((a, b) => b.cents - a.cents),
  }
}

/** Los apuntes de la libreta de la landing: los primeros del mes de ejemplo. */
export function ledgerEntries(now: Date): DemoTransaction[] {
  const wanted = ['nomina', 'alquiler', 'supermercado', 'suministros']
  const rows = buildDemo(now).monthRows
  return wanted
    .map((id) => rows.find((r) => r.category_id === id))
    .filter((r): r is DemoTransaction => Boolean(r))
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
}
