import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/fetch-all'
import { addMonths, differenceInCalendarMonths, format, parseISO, startOfDay, subDays } from 'date-fns'

export type GoalStatus = 'completed' | 'on_track' | 'behind' | 'overdue' | 'no_deadline'

export type GoalRow = {
  id: string
  name: string
  icon: string | null
  target_cents: number
  /** 'yyyy-MM-dd' o null. */
  target_date: string | null
  /** Cuenta vinculada: si existe, el progreso sale de su saldo y no de las aportaciones. */
  account_id?: string | null
}

/** Datos de la cuenta vinculada a un objetivo. */
export type LinkedAccount = {
  name: string
  /** Saldo actual (efectivo + valor de los activos), de la vista account_balances. */
  balanceCents: number
  /** Movimientos de la cuenta (traspasos incluidos) de, al menos, la ventana del ritmo. */
  flows: { amount_cents: number; transaction_date: string }[]
}

export type ContributionRow = {
  goal_id: string
  /** Positivo = aportación, negativo = retirada. */
  amount_cents: number
  /** 'yyyy-MM-dd'. */
  contribution_date: string
}

export type GoalProgress = {
  id: string
  name: string
  icon: string | null
  targetCents: number
  targetDate: string | null
  savedCents: number
  remainingCents: number
  /** ahorrado / objetivo, sin limitar a 1. */
  ratio: number
  status: GoalStatus
  /** Cuánto habría que aportar al mes para llegar a la fecha (solo con fecha y sin completar). */
  requiredPerMonthCents: number | null
  /** Ritmo real: media mensual neta de los últimos 90 días. */
  paceCents: number
  /** Fecha estimada de cumplimiento al ritmo actual; null si no hay ritmo positivo. */
  projectedDate: Date | null
  /** Cuenta vinculada (null si el progreso sale de aportaciones manuales). */
  account: { id: string; name: string } | null
}

/** Ventana con la que se mide el ritmo de ahorro. */
export const PACE_WINDOW_DAYS = 90

/**
 * Progreso de un objetivo. Parte pura (sin base de datos) para poder testearla. Todo en
 * céntimos enteros. Sin cuenta vinculada, lo ahorrado es la suma de las aportaciones;
 * con ella (`linked`), el saldo de la cuenta, y el ritmo sale de sus movimientos netos
 * (las revalorizaciones de una cuenta de inversión no cuentan como ritmo de ahorro).
 */
export function computeGoalProgress(
  goal: GoalRow,
  contributions: ContributionRow[],
  now: Date,
  linked?: LinkedAccount | null
): GoalProgress {
  const today = startOfDay(now)
  const windowStart = subDays(today, PACE_WINDOW_DAYS)

  // Mismo cálculo para las dos fuentes: total y movimientos fechados.
  const entries = linked
    ? linked.flows.map((f) => ({ cents: f.amount_cents, date: f.transaction_date }))
    : contributions
        .filter((c) => c.goal_id === goal.id)
        .map((c) => ({ cents: c.amount_cents, date: c.contribution_date }))
  const total = linked ? linked.balanceCents : entries.reduce((sum, e) => sum + e.cents, 0)

  const savedCents = Math.max(total, 0)
  const remainingCents = Math.max(goal.target_cents - savedCents, 0)
  const ratio = savedCents / goal.target_cents

  const windowNet = entries
    .filter((e) => parseISO(e.date) > windowStart)
    .reduce((sum, e) => sum + e.cents, 0)
  const paceCents = Math.round((windowNet / PACE_WINDOW_DAYS) * 30.4375)

  const projectedDate =
    remainingCents > 0 && paceCents > 0
      ? addMonths(today, Math.ceil(remainingCents / paceCents))
      : null

  const target = goal.target_date ? parseISO(goal.target_date) : null
  let status: GoalStatus
  let requiredPerMonthCents: number | null = null

  if (remainingCents === 0) {
    status = 'completed'
  } else if (!target) {
    status = 'no_deadline'
  } else if (target < today) {
    status = 'overdue'
  } else {
    // Mínimo un mes: aunque la fecha caiga este mismo mes, se reparte entre 1.
    const monthsLeft = Math.max(differenceInCalendarMonths(target, today), 1)
    requiredPerMonthCents = Math.ceil(remainingCents / monthsLeft)
    status = projectedDate && projectedDate <= target ? 'on_track' : 'behind'
  }

  return {
    id: goal.id,
    name: goal.name,
    icon: goal.icon,
    targetCents: goal.target_cents,
    targetDate: goal.target_date,
    savedCents,
    remainingCents,
    ratio,
    status,
    requiredPerMonthCents,
    paceCents,
    projectedDate,
    account: linked && goal.account_id ? { id: goal.account_id, name: linked.name } : null,
  }
}

/**
 * Si la cuenta vinculada se borró (o no llegó), el objetivo vuelve a las aportaciones
 * manuales, que se conservan.
 */
export function computeGoals(
  goals: GoalRow[],
  contributions: ContributionRow[],
  now: Date,
  accounts: Map<string, LinkedAccount> = new Map()
): GoalProgress[] {
  return goals.map((g) =>
    computeGoalProgress(g, contributions, now, g.account_id ? accounts.get(g.account_id) : null)
  )
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/** Saldo y movimientos recientes de las cuentas vinculadas a algún objetivo. */
export async function getLinkedAccounts(
  supabase: SupabaseServer,
  goals: GoalRow[],
  now: Date
): Promise<Map<string, LinkedAccount>> {
  const ids = [...new Set(goals.map((g) => g.account_id).filter((id): id is string => !!id))]
  const map = new Map<string, LinkedAccount>()
  if (ids.length === 0) return map

  const since = format(subDays(startOfDay(now), PACE_WINDOW_DAYS), 'yyyy-MM-dd')
  const [{ data: balances }, { data: flows }] = await Promise.all([
    supabase.from('account_balances').select('id, name, balance_cents').in('id', ids),
    supabase
      .from('transactions')
      .select('account_id, amount_cents, transaction_date')
      .is('deleted_at', null)
      .in('account_id', ids)
      .gte('transaction_date', since),
  ])

  for (const b of balances ?? []) {
    if (!b.id) continue
    map.set(b.id, {
      name: b.name ?? 'Cuenta',
      balanceCents: b.balance_cents ?? 0,
      flows: (flows ?? []).filter((f) => f.account_id === b.id),
    })
  }
  return map
}

/** Aportación neta de un objetivo en un periodo, con la forma que usan los informes. */
export type ReportGoalContribution = {
  goal_id: string
  amount_cents: number
  savings_goals: { name: string }
}

/**
 * Parte pura: movimientos de cuentas vinculadas → aportación neta por objetivo. Los
 * traspasos cuentan (son el dinero que entra o sale del objetivo); las revalorizaciones de
 * una cuenta de inversión no son movimientos, así que no aparecen.
 */
export function linkedGoalContributions(
  goals: { id: string; name: string; account_id: string | null }[],
  flows: { account_id: string; amount_cents: number }[]
): ReportGoalContribution[] {
  const result: ReportGoalContribution[] = []
  for (const g of goals) {
    if (!g.account_id) continue
    const net = flows
      .filter((f) => f.account_id === g.account_id)
      .reduce((sum, f) => sum + f.amount_cents, 0)
    if (net !== 0) result.push({ goal_id: g.id, amount_cents: net, savings_goals: { name: g.name } })
  }
  return result
}

/** Aportación neta de los objetivos vinculados a una cuenta entre dos fechas ('yyyy-MM-dd'). */
export async function getLinkedGoalContributions(
  supabase: SupabaseServer,
  from: string,
  through: string
): Promise<ReportGoalContribution[]> {
  const { data: goals } = await supabase
    .from('savings_goals')
    .select('id, name, account_id')
    .not('account_id', 'is', null)
  if (!goals || goals.length === 0) return []

  const ids = [...new Set(goals.map((g) => g.account_id).filter((id): id is string => !!id))]
  const flows = await fetchAllRows((start, end) =>
    supabase
      .from('transactions')
      .select('account_id, amount_cents')
      .is('deleted_at', null)
      .in('account_id', ids)
      .gte('transaction_date', from)
      .lte('transaction_date', through)
      .order('id')
      .range(start, end)
  )
  return linkedGoalContributions(goals, flows)
}

/** Objetivos del usuario con su progreso (consulta y delega en computeGoals). */
export async function getGoals(now = new Date()): Promise<GoalProgress[]> {
  const supabase = await createClient()
  const [{ data: goals }, { data: contributions }] = await Promise.all([
    supabase
      .from('savings_goals')
      .select('id, name, icon, target_cents, target_date, account_id')
      .order('created_at', { ascending: true }),
    supabase.from('goal_contributions').select('goal_id, amount_cents, contribution_date'),
  ])
  const accounts = await getLinkedAccounts(supabase, goals ?? [], now)
  return computeGoals(goals ?? [], contributions ?? [], now, accounts)
}
