import { describe, expect, it } from 'vitest'
import { computeGoalProgress, type ContributionRow, type GoalRow } from './goals'

const now = new Date(2026, 9, 6) // 6 oct 2026
const goal: GoalRow = {
  id: 'g1',
  name: 'Viaje',
  icon: null,
  target_cents: 120000,
  target_date: '2027-04-06',
}
const c = (amount_cents: number, contribution_date: string, goal_id = 'g1'): ContributionRow => ({
  goal_id,
  amount_cents,
  contribution_date,
})

describe('computeGoalProgress', () => {
  it('suma aportaciones y resta retiradas; ignora las de otros objetivos', () => {
    const p = computeGoalProgress(
      goal,
      [c(30000, '2026-09-01'), c(-5000, '2026-09-10'), c(99999, '2026-09-10', 'otro')],
      now
    )
    expect(p.savedCents).toBe(25000)
    expect(p.remainingCents).toBe(95000)
    expect(p.ratio).toBeCloseTo(25000 / 120000)
  })

  it('el ahorrado nunca es negativo', () => {
    expect(computeGoalProgress(goal, [c(-100, '2026-09-01')], now).savedCents).toBe(0)
  })

  it('completado cuando se alcanza o supera el objetivo', () => {
    const p = computeGoalProgress(goal, [c(130000, '2026-09-01')], now)
    expect(p.status).toBe('completed')
    expect(p.remainingCents).toBe(0)
    expect(p.requiredPerMonthCents).toBeNull()
    expect(p.ratio).toBeGreaterThan(1)
  })

  it('sin fecha: no_deadline y sin cuota necesaria', () => {
    const p = computeGoalProgress({ ...goal, target_date: null }, [c(1000, '2026-09-01')], now)
    expect(p.status).toBe('no_deadline')
    expect(p.requiredPerMonthCents).toBeNull()
  })

  it('cuota mensual necesaria redondeada hacia arriba', () => {
    // 6 meses hasta abril; faltan 120000 → 20000 al mes.
    expect(computeGoalProgress(goal, [], now).requiredPerMonthCents).toBe(20000)
    // 100 céntimos entre 6 meses = 16,67 → 17
    const p = computeGoalProgress({ ...goal, target_cents: 100 }, [], now)
    expect(p.requiredPerMonthCents).toBe(17)
  })

  it('al ritmo actual llega a tiempo → on_track', () => {
    // 90 días con 60000 → ~20000/mes; faltan 60000 → 3 meses (ene 2027) < abril.
    const p = computeGoalProgress(goal, [c(60000, '2026-08-20'), c(0, '2026-09-01')], now)
    expect(p.paceCents).toBeGreaterThan(0)
    expect(p.status).toBe('on_track')
    expect(p.projectedDate).not.toBeNull()
  })

  it('ritmo insuficiente o nulo → behind', () => {
    expect(computeGoalProgress(goal, [], now).status).toBe('behind')
    // Aportación antigua (fuera de la ventana de 90 días) no cuenta como ritmo.
    const old = computeGoalProgress(goal, [c(10000, '2026-01-01')], now)
    expect(old.paceCents).toBe(0)
    expect(old.projectedDate).toBeNull()
    expect(old.status).toBe('behind')
  })

  it('fecha pasada sin completar → overdue', () => {
    const p = computeGoalProgress({ ...goal, target_date: '2026-09-30' }, [c(1000, '2026-09-01')], now)
    expect(p.status).toBe('overdue')
  })

  it('fecha este mismo mes: reparte en un solo mes', () => {
    const p = computeGoalProgress({ ...goal, target_date: '2026-10-25' }, [], now)
    expect(p.requiredPerMonthCents).toBe(120000)
  })
})
