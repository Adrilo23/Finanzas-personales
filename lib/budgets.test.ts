import { describe, expect, test } from 'vitest'
import { computeBudgetProgress, statusFor } from './budgets'

const categories = [
  { id: 'alim', parent_id: null },
  { id: 'merca', parent_id: 'alim' }, // subcategoría de Alimentación
  { id: 'ocio', parent_id: null },
  { id: 'nomina', parent_id: null },
]

const expense = (category_id: string, amount_cents: number) => ({
  category_id,
  amount_cents,
  categories: { type: 'expense' },
})

const budget = (id: string, category_id: string, amount_cents: number, name = id) => ({
  id,
  category_id,
  amount_cents,
  categories: { name, icon: null },
})

describe('statusFor', () => {
  test.each([
    [0, 'ok'],
    [0.79, 'ok'],
    [0.8, 'warning'],
    [1, 'warning'], // justo en el límite todavía no está superado
    [1.0001, 'over'],
    [2.5, 'over'],
  ] as const)('%d → %s', (ratio, status) => {
    expect(statusFor(ratio)).toBe(status)
  })
})

describe('computeBudgetProgress', () => {
  test('sin presupuestos devuelve lista vacía', () => {
    expect(computeBudgetProgress([], [expense('alim', -1000)], categories)).toEqual([])
  })

  test('suma los gastos en valor absoluto', () => {
    const [result] = computeBudgetProgress(
      [budget('b1', 'ocio', 10000)],
      [expense('ocio', -2500), expense('ocio', -1500)],
      categories
    )
    expect(result.spentCents).toBe(4000)
    expect(result.ratio).toBe(0.4)
    expect(result.status).toBe('ok')
  })

  test('lo gastado en una subcategoría cuenta para el padre', () => {
    const [alim] = computeBudgetProgress(
      [budget('b1', 'alim', 30000)],
      [expense('alim', -5000), expense('merca', -20000)],
      categories
    )
    expect(alim.spentCents).toBe(25000)
    expect(alim.status).toBe('warning')
  })

  test('el presupuesto de una subcategoría solo cuenta lo suyo', () => {
    const [merca] = computeBudgetProgress(
      [budget('b1', 'merca', 10000)],
      [expense('alim', -5000), expense('merca', -12000)],
      categories
    )
    expect(merca.spentCents).toBe(12000)
    expect(merca.status).toBe('over')
  })

  test('ignora ingresos, inversión y movimientos sin categoría', () => {
    const [result] = computeBudgetProgress(
      [budget('b1', 'ocio', 10000)],
      [
        expense('ocio', -1000),
        { category_id: 'ocio', amount_cents: 5000, categories: { type: 'income' } },
        { category_id: 'ocio', amount_cents: -5000, categories: { type: 'investment' } },
        { category_id: null, amount_cents: -5000, categories: null },
      ],
      categories
    )
    expect(result.spentCents).toBe(1000)
  })

  test('acepta la relación embebida como array (forma alternativa de Supabase)', () => {
    const [result] = computeBudgetProgress(
      [{ id: 'b1', category_id: 'ocio', amount_cents: 1000, categories: [{ name: 'Ocio', icon: '🎬' }] }],
      [{ category_id: 'ocio', amount_cents: -500, categories: [{ type: 'expense' }] }],
      categories
    )
    expect(result).toMatchObject({ name: 'Ocio', icon: '🎬', spentCents: 500 })
  })
})
