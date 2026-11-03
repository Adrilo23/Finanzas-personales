import { describe, expect, it } from 'vitest'
import {
  adjacentYears,
  annualRanges,
  computeAnnualReport,
  parseYearParam,
  type AnnualTransaction,
} from './annual-report'

const now = new Date(2026, 10, 3) // 3 nov 2026

const tx = (
  amount_cents: number,
  transaction_date: string,
  name: string,
  type: string,
  description: string | null = null
): AnnualTransaction => ({
  amount_cents,
  description,
  transaction_date,
  categories: { name, type, icon: null },
})

/** Pata de traspaso: sin categoría. */
const transferLeg = (amount_cents: number, transaction_date: string): AnnualTransaction => ({
  amount_cents,
  description: null,
  transaction_date,
  categories: null,
})

describe('parseYearParam / adjacentYears', () => {
  it('acepta años válidos y cae al actual en el resto', () => {
    expect(parseYearParam('2025', now)).toBe(2025)
    expect(parseYearParam('2027', now)).toBe(2026) // futuro
    expect(parseYearParam('1999', now)).toBe(2026)
    expect(parseYearParam('abc', now)).toBe(2026)
    expect(parseYearParam(undefined, now)).toBe(2026)
  })

  it('no ofrece año siguiente si es el actual', () => {
    expect(adjacentYears(2026, now)).toEqual({ prev: 2025, next: null })
    expect(adjacentYears(2024, now)).toEqual({ prev: 2023, next: 2025 })
  })
})

describe('annualRanges', () => {
  it('año cerrado: año completo frente a año completo', () => {
    expect(annualRanges(2025, now)).toEqual({
      partial: false,
      from: '2025-01-01',
      through: '2025-12-31',
      previousFrom: '2024-01-01',
      previousThrough: '2024-12-31',
    })
  })

  it('año en curso: hasta hoy frente al mismo periodo del año anterior', () => {
    expect(annualRanges(2026, now)).toEqual({
      partial: true,
      from: '2026-01-01',
      through: '2026-11-03',
      previousFrom: '2025-01-01',
      previousThrough: '2025-11-03',
    })
  })
})

describe('computeAnnualReport', () => {
  const rows = [
    tx(200000, '2025-01-31', 'Nómina', 'income'),
    tx(200000, '2025-02-28', 'Nómina', 'income'),
    tx(-80000, '2025-01-05', 'Alquiler', 'expense', 'Piso enero'),
    tx(-80000, '2025-02-05', 'Alquiler', 'expense', 'Piso febrero'),
    tx(-12000, '2025-02-10', 'Comida', 'expense'),
    tx(-50000, '2025-02-15', 'Fondos', 'investment'),
    transferLeg(-30000, '2025-02-20'),
    transferLeg(30000, '2025-02-20'),
  ]
  const previousRows = [
    tx(300000, '2024-03-31', 'Nómina', 'income'),
    tx(-100000, '2024-03-05', 'Alquiler', 'expense'),
    tx(-5000, '2024-03-06', 'Ocio', 'expense'),
  ]

  const report = computeAnnualReport(2025, now, rows, previousRows, [
    { goal_id: 'g', amount_cents: 10000, savings_goals: { name: 'Viaje' } },
    { goal_id: 'g', amount_cents: -2000, savings_goals: { name: 'Viaje' } },
  ])

  it('totales, balance y tasa de ahorro; los traspasos no cuentan', () => {
    expect(report.totals).toEqual({ income: 400000, expense: 172000, investment: 50000 })
    expect(report.balanceCents).toBe(178000)
    expect(report.savingsRate).toBeCloseTo(0.445)
    expect(report.previousBalanceCents).toBe(195000)
  })

  it('variaciones frente al año anterior', () => {
    expect(report.changes.income).toBeCloseTo(33.33, 1)
    expect(report.changes.expense).toBeCloseTo(63.81, 1)
    expect(report.changes.investment).toBeNull() // sin inversión el año anterior
    expect(report.changes.balance).toBeCloseTo(-8.72, 1)
  })

  it('no da % de balance si el año anterior fue negativo', () => {
    const r = computeAnnualReport(2025, now, rows, [tx(-1000, '2024-05-01', 'Ocio', 'expense')], [])
    expect(r.changes.balance).toBeNull()
  })

  it('12 meses, con los vacíos a 0', () => {
    expect(report.months).toHaveLength(12)
    expect(report.months[0]).toMatchObject({ key: '2025-01', label: 'ene', income: 200000, expense: 80000, balance: 120000 })
    expect(report.months[1]).toMatchObject({ income: 200000, expense: 92000, investment: 50000, balance: 58000 })
    expect(report.months[11]).toMatchObject({ key: '2025-12', income: 0, expense: 0, balance: 0 })
  })

  it('gasto por categoría comparado con el año anterior, incluidas las que ya no tienen gasto', () => {
    expect(report.categories.map((c) => [c.name, c.cents, c.previousCents])).toEqual([
      ['Alquiler', 160000, 100000],
      ['Comida', 12000, 0],
      ['Ocio', 0, 5000],
    ])
    expect(report.categories[0].change).toBeCloseTo(60)
    expect(report.categories[1].change).toBeNull()
    expect(report.categories[2].change).toBe(-100)
    expect(report.categories[0].share).toBeCloseTo(160000 / 172000)
  })

  it('mayores gastos y aportaciones netas a objetivos', () => {
    expect(report.topExpenses[0]).toMatchObject({ description: 'Piso enero', cents: 80000 })
    expect(report.topExpenses.map((e) => e.category)).not.toContain('Fondos')
    expect(report.goals).toEqual([{ name: 'Viaje', netCents: 8000 }])
  })

  it('año en curso marcado como parcial; sin datos', () => {
    const empty = computeAnnualReport(2026, now, [], [], [])
    expect(empty.partial).toBe(true)
    expect(empty.through).toBe('2026-11-03')
    expect(empty.hasData).toBe(false)
    expect(empty.savingsRate).toBeNull()
  })
})
