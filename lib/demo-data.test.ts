import { describe, expect, it } from 'vitest'
import { buildDemo, demoMonth, demoTransactions, ledgerEntries } from './demo-data'

const now = new Date(2026, 10, 5) // 5 nov 2026

describe('demo-data', () => {
  it('el mes de la demo es el último mes completo', () => {
    expect(demoMonth(now)).toEqual(new Date(2026, 9, 1))
    expect(buildDemo(now).monthRows.every((t) => t.transaction_date.startsWith('2026-10'))).toBe(true)
  })

  it('es determinista', () => {
    expect(demoTransactions(now)).toEqual(demoTransactions(now))
  })

  it('doce meses, sin fechas imposibles ni importes a cero', () => {
    const rows = demoTransactions(now)
    const months = new Set(rows.map((r) => r.transaction_date.slice(0, 7)))
    expect(months.size).toBe(12)
    for (const r of rows) {
      expect(Number.isInteger(r.amount_cents)).toBe(true)
      expect(r.amount_cents).not.toBe(0)
      const d = new Date(`${r.transaction_date}T12:00:00`)
      expect(Number.isNaN(d.getTime())).toBe(false)
    }
  })

  it('un mes con sentido: ahorra, y los signos siguen la regla de la app', () => {
    const demo = buildDemo(now)
    expect(demo.totals.income).toBe(185000)
    expect(demo.balanceCents).toBeGreaterThan(0)
    for (const t of demo.monthRows) {
      expect(t.amount_cents > 0).toBe(t.categories.type === 'income')
    }
  })

  it('el presupuesto de Alimentación suma sus subcategorías', () => {
    const demo = buildDemo(now)
    const food = demo.budgets.find((b) => b.categoryId === 'alimentacion')!
    const fromSubs = demo.monthRows
      .filter((t) => t.category_id === 'supermercado' || t.category_id === 'restaurantes')
      .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0)
    expect(food.spentCents).toBe(fromSubs)
  })

  it('evolución de 12 meses, todos con datos', () => {
    const evolution = buildDemo(now).evolution
    expect(evolution).toHaveLength(12)
    expect(evolution.every((p) => p.ingresos > 0)).toBe(true)
  })

  it('la libreta tiene cuatro apuntes ordenados por fecha', () => {
    const entries = ledgerEntries(now)
    expect(entries).toHaveLength(4)
    const dates = entries.map((e) => e.transaction_date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('funciona en enero (el mes de la demo es diciembre del año anterior)', () => {
    const jan = buildDemo(new Date(2027, 0, 3))
    expect(jan.monthRows[0].transaction_date.startsWith('2026-12')).toBe(true)
  })
})

describe('demo-data: un año creíble', () => {
  it('pagas extra en junio y diciembre, y presupuestos en los tres estados', () => {
    const rows = demoTransactions(now)
    expect(rows.filter((r) => r.description.startsWith('Paga extra'))).toHaveLength(2)
    const statuses = new Set(buildDemo(now).budgets.map((b) => b.status))
    expect(statuses).toEqual(new Set(['ok', 'warning', 'over']))
  })

  it('la suma de todos los apuntes del mes es el balance (la libreta cuadra)', () => {
    const demo = buildDemo(now)
    const sum = demo.monthRows.reduce((total, r) => total + r.amount_cents, 0)
    expect(sum).toBe(demo.balanceCents)
  })
})
