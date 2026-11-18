import { describe, expect, test } from 'vitest'
import { percentChange, sumByType } from './stats'
import { aggregateDaily, aggregateMonthly, aggregateYearMonths } from './reports'

describe('sumByType', () => {
  test('separa ingresos, gastos e inversión en céntimos positivos', () => {
    expect(
      sumByType([
        { amount_cents: 200000, categories: { type: 'income' } },
        { amount_cents: -45050, categories: { type: 'expense' } },
        { amount_cents: -1999, categories: [{ type: 'expense' }] },
        { amount_cents: -30000, categories: { type: 'investment' } },
        { amount_cents: -9999, categories: null }, // sin categoría: no cuenta
      ])
    ).toEqual({ income: 200000, expense: 47049, investment: 30000 })
  })
})

describe('percentChange', () => {
  test('calcula la variación', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
  })

  test('sin mes anterior no hay variación', () => {
    expect(percentChange(100, 0)).toBeNull()
  })
})

describe('aggregateMonthly', () => {
  const now = new Date(2026, 9, 4) // 4 oct 2026

  test('devuelve siempre 12 meses, del más antiguo al actual', () => {
    const result = aggregateMonthly([], now)
    expect(result).toHaveLength(12)
    expect(result[0].month).toBe('nov 25')
    expect(result[11].month).toBe('oct 26')
    expect(result.every((p) => p.balance === 0)).toBe(true)
  })

  test('agrupa por mes, en euros, y descarta lo anterior a la ventana', () => {
    const result = aggregateMonthly(
      [
        { amount_cents: 200000, transaction_date: '2026-10-01', categories: { type: 'income' } },
        { amount_cents: -45050, transaction_date: '2026-10-03', categories: { type: 'expense' } },
        { amount_cents: -30000, transaction_date: '2026-10-02', categories: { type: 'investment' } },
        { amount_cents: -1000, transaction_date: '2026-09-15', categories: { type: 'expense' } },
        { amount_cents: -99999, transaction_date: '2025-10-31', categories: { type: 'expense' } },
      ],
      now
    )
    expect(result[11]).toEqual({
      month: 'oct 26',
      ingresos: 2000,
      gastos: 450.5,
      inversion: 300,
      balance: 1249.5,
    })
    expect(result[10].gastos).toBe(10)
    expect(result.reduce((sum, p) => sum + p.gastos, 0)).toBe(460.5)
  })
})

const row = (amount_cents: number, transaction_date: string, type: string | null) => ({
  amount_cents,
  transaction_date,
  categories: type ? { type } : null,
})

describe('aggregateDaily', () => {
  test('mes en curso: un punto por día hasta hoy', () => {
    const result = aggregateDaily([], new Date(2026, 10, 1), new Date(2026, 10, 18))
    expect(result).toHaveLength(18)
    expect(result[0]).toMatchObject({ axis: '1', period: '2026-11-01', ingresos: 0 })
    expect(result[17]).toMatchObject({ axis: '18', period: '2026-11-18' })
  })

  test('mes pasado: todos los días del mes', () => {
    expect(aggregateDaily([], new Date(2026, 1, 1), new Date(2026, 10, 18))).toHaveLength(28)
  })

  test('suma por día, ignora otros meses y los traspasos no cuentan', () => {
    const result = aggregateDaily(
      [
        row(150000, '2026-11-02', 'income'),
        row(-4050, '2026-11-02', 'expense'),
        row(-1000, '2026-11-02', 'expense'),
        row(-20000, '2026-11-10', 'investment'),
        row(-5000, '2026-11-10', null),
        row(5000, '2026-11-10', null),
        row(-999, '2026-10-31', 'expense'),
      ],
      new Date(2026, 10, 1),
      new Date(2026, 10, 18)
    )
    expect(result[1]).toMatchObject({ ingresos: 1500, gastos: 50.5, balance: 1449.5 })
    expect(result[9]).toMatchObject({ inversion: 200, gastos: 0, balance: -200 })
    expect(result.reduce((sum, p) => sum + p.gastos, 0)).toBe(50.5)
  })
})

describe('aggregateYearMonths', () => {
  const now = new Date(2026, 10, 3)

  test('año en curso: de enero al mes actual, con los vacíos a 0', () => {
    const result = aggregateYearMonths([], 2026, now)
    expect(result).toHaveLength(11)
    expect(result[0]).toMatchObject({ axis: 'ene', period: '2026-01', balance: 0 })
    expect(result[10].period).toBe('2026-11')
  })

  test('año pasado: los 12 meses', () => {
    expect(aggregateYearMonths([], 2025, now)).toHaveLength(12)
  })

  test('agrupa por mes, ignora otros años y los traspasos no cuentan', () => {
    const result = aggregateYearMonths(
      [
        row(150000, '2025-03-01', 'income'),
        row(-40000, '2025-03-02', 'expense'),
        row(-10000, '2025-12-10', 'investment'),
        row(-5000, '2025-02-01', null),
        row(5000, '2025-02-01', null),
        row(99999, '2024-03-01', 'income'),
      ],
      2025,
      now
    )
    expect(result[2]).toMatchObject({ ingresos: 1500, gastos: 400, balance: 1100 })
    expect(result[11]).toMatchObject({ inversion: 100, balance: -100 })
    expect(result[1]).toMatchObject({ ingresos: 0, gastos: 0, balance: 0 })
  })
})
