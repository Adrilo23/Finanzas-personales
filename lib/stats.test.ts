import { describe, expect, test } from 'vitest'
import { percentChange, sumByType } from './stats'
import { aggregateMonthly } from './reports'

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
