import { createClient } from '@/lib/supabase/server'
import { addMonths, differenceInCalendarMonths, parseISO, startOfDay, subDays } from 'date-fns'

export type GoalStatus = 'completed' | 'on_track' | 'behind' | 'overdue' | 'no_deadline'

export type GoalRow = {
  id: string
  name: string
  icon: string | null
  target_cents: number
  /** 'yyyy-MM-dd' o null. */
  target_date: string | null
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
}

/** Ventana con la que se mide el ritmo de ahorro. */
export const PACE_WINDOW_DAYS = 90

/**
 * Progreso de un objetivo a partir de sus aportaciones. Parte pura (sin base de datos)
 * para poder testearla. Todo en céntimos enteros.
 */
export function computeGoalProgress(
  goal: GoalRow,
  contributions: ContributionRow[],
  now: Date
): GoalProgress {
  const mine = contributions.filter((c) => c.goal_id === goal.id)
  const savedCents = Math.max(
    mine.reduce((sum, c) => sum + c.amount_cents, 0),
    0
  )
  const remainingCents = Math.max(goal.target_cents - savedCents, 0)
  const ratio = savedCents / goal.target_cents

  const today = startOfDay(now)
  const windowStart = subDays(today, PACE_WINDOW_DAYS)
  const windowNet = mine
    .filter((c) => parseISO(c.contribution_date) > windowStart)
    .reduce((sum, c) => sum + c.amount_cents, 0)
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
  }
}

export function computeGoals(
  goals: GoalRow[],
  contributions: ContributionRow[],
  now: Date
): GoalProgress[] {
  return goals.map((g) => computeGoalProgress(g, contributions, now))
}

/** Objetivos del usuario con su progreso (consulta y delega en computeGoals). */
export async function getGoals(now = new Date()): Promise<GoalProgress[]> {
  const supabase = await createClient()
  const [{ data: goals }, { data: contributions }] = await Promise.all([
    supabase
      .from('savings_goals')
      .select('id, name, icon, target_cents, target_date')
      .order('created_at', { ascending: true }),
    supabase.from('goal_contributions').select('goal_id, amount_cents, contribution_date'),
  ])
  return computeGoals(goals ?? [], contributions ?? [], now)
}
