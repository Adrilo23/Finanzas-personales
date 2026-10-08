import { describe, expect, it } from 'vitest'
import {
  adjacentMonths,
  computeMonthlyReport,
  parseMonthParam,
  type ReportTransaction,
} from './monthly-report'

const month = new Date(2026, 8, 1) // septiembre 2026
const tx = (
  amount_cents: number,
  type: string | null,
  name = 'Cat',
  date = '2026-09-10',
  description: string | null = null
): ReportTransaction => ({
  category_id: type ? `c-${name}` : null,
  amount_cents,
  description,
  transaction_date: date,
  categories: type ? { name, type, icon: null } : null,
})

describe('computeMonthlyReport', () => {
  const rows = [
    tx(200000, 'income', 'Nómina'),
    tx(-60000, 'expense', 'Alquiler'),
    tx(-20000, 'expense', 'Comida', '2026-09-12', 'Súper'),
    tx(-20000, 'expense', 'Comida', '2026-09-20'),
    tx(-30000, 'investment', 'Inversión'),
    tx(-5000, null), // traspaso: sin categoría, no cuenta
  ]
  const previous = [tx(100000, 'income', 'Nómina', '2026-08-05'), tx(-50000, 'expense', 'Alquiler', '2026-08-05')]

  const report = computeMonthlyReport(month, rows, previous, [], [], [])

  it('calcula totales, balance y tasa de ahorro', () => {
    expect(report.totals).toEqual({ income: 200000, expense: 100000, investment: 30000 })
    expect(report.balanceCents).toBe(70000)
    expect(report.savingsRate).toBeCloseTo(0.35)
    expect(report.month).toBe('2026-09')
  })

  it('compara con el mes anterior', () => {
    expect(report.changes.income).toBe(100)
    expect(report.changes.expense).toBe(100)
    expect(report.changes.investment).toBeNull()
  })

  it('agrupa gasto por categoría con su porcentaje y ordena de mayor a menor', () => {
    expect(report.topCategories.map((c) => [c.name, c.cents])).toEqual([
      ['Alquiler', 60000],
      ['Comida', 40000],
    ])
    expect(report.topCategories[0].share).toBeCloseTo(0.6)
  })

  it('lista los mayores gastos y no cuenta traspasos ni ingresos', () => {
    expect(report.topExpenses[0]).toMatchObject({ category: 'Alquiler', cents: 60000 })
    expect(report.topExpenses).toHaveLength(3)
    expect(report.topExpenses.find((e) => e.description === 'Súper')).toBeDefined()
    expect(report.transactionCount).toBe(5)
  })

  it('sin ingresos no hay tasa de ahorro; sin datos, hasData=false', () => {
    const empty = computeMonthlyReport(month, [], [], [], [], [])
    expect(empty.savingsRate).toBeNull()
    expect(empty.hasData).toBe(false)
    expect(empty.changes.income).toBeNull()
  })

  it('suma las aportaciones netas por objetivo e ignora las que quedan a 0', () => {
    const r = computeMonthlyReport(
      month,
      [],
      [],
      [],
      [],
      [
        { goal_id: 'a', amount_cents: 5000, savings_goals: { name: 'Viaje' } },
        { goal_id: 'a', amount_cents: -2000, savings_goals: [{ name: 'Viaje' }] },
        { goal_id: 'b', amount_cents: 1000, savings_goals: { name: 'Coche' } },
        { goal_id: 'b', amount_cents: -1000, savings_goals: { name: 'Coche' } },
      ]
    )
    expect(r.goals).toEqual([{ name: 'Viaje', netCents: 3000 }])
  })
})

describe('parseMonthParam / adjacentMonths', () => {
  const now = new Date(2026, 9, 6)
  it('acepta yyyy-MM y cae al mes actual si no es válido o es futuro', () => {
    expect(parseMonthParam('2026-03', now)).toEqual(new Date(2026, 2, 1))
    expect(parseMonthParam('2027-01', now)).toEqual(new Date(2026, 9, 1))
    expect(parseMonthParam('basura', now)).toEqual(new Date(2026, 9, 1))
    expect(parseMonthParam('2026-13', now)).toEqual(new Date(2026, 9, 1))
    expect(parseMonthParam(null, now)).toEqual(new Date(2026, 9, 1))
  })
  it('no ofrece un mes siguiente futuro', () => {
    expect(adjacentMonths(new Date(2026, 9, 1), now)).toEqual({ prev: '2026-09', next: null })
    expect(adjacentMonths(new Date(2026, 8, 1), now)).toEqual({ prev: '2026-08', next: '2026-10' })
    expect(adjacentMonths(new Date(2026, 0, 1), now).prev).toBe('2025-12')
  })
})
