import { describe, expect, test } from 'vitest'
import { buildTransferRows, isHiddenTransferLeg, pairTransferLegs } from './transfers'
import { sumByType } from './stats'
import { aggregateMonthly } from './reports'

const base = {
  userId: 'u1',
  transferId: 't1',
  fromAccountId: 'bbva',
  toAccountId: 'myinvestor',
  amountCents: 50000,
  date: '2026-10-05',
}

describe('buildTransferRows', () => {
  test('una pata negativa en origen y otra positiva en destino, sin categoría', () => {
    const [out, inn] = buildTransferRows({ ...base, description: 'Aportación' })
    expect(out).toMatchObject({ account_id: 'bbva', amount_cents: -50000, category_id: null })
    expect(inn).toMatchObject({ account_id: 'myinvestor', amount_cents: 50000, category_id: null })
    expect(out.transfer_id).toBe('t1')
    expect(inn.transfer_id).toBe('t1')
    expect(out.description).toBe('Aportación')
  })

  test('el importe siempre se trata en positivo', () => {
    const [out, inn] = buildTransferRows({ ...base, amountCents: -50000 })
    expect(out.amount_cents).toBe(-50000)
    expect(inn.amount_cents).toBe(50000)
  })

  test('las dos patas suman cero: el patrimonio total no cambia', () => {
    const rows = buildTransferRows(base)
    expect(rows.reduce((sum, r) => sum + r.amount_cents, 0)).toBe(0)
  })

  test('guarda la regla recurrente que lo generó', () => {
    const rows = buildTransferRows({ ...base, recurringRuleId: 'r1' })
    expect(rows.every((r) => r.recurring_rule_id === 'r1')).toBe(true)
  })
})

describe('los traspasos no cuentan como ingreso, gasto ni inversión', () => {
  const legs = buildTransferRows(base).map((r) => ({ ...r, categories: null }))

  test('totales del inicio', () => {
    expect(sumByType(legs)).toEqual({ income: 0, expense: 0, investment: 0 })
  })

  test('evolución mensual: no cambian el balance del mes', () => {
    const month = aggregateMonthly(legs, new Date(2026, 9, 20))[11]
    expect(month).toMatchObject({ ingresos: 0, gastos: 0, inversion: 0, balance: 0 })
  })
})

describe('pairTransferLegs', () => {
  test('identifica origen y destino', () => {
    const map = pairTransferLegs([
      { transfer_id: 't1', account_id: 'bbva', amount_cents: -50000, accountName: 'BBVA' },
      { transfer_id: 't1', account_id: 'mi', amount_cents: 50000, accountName: 'My Investor' },
      { transfer_id: null, account_id: 'bbva', amount_cents: -1000 },
    ])
    expect(map.size).toBe(1)
    expect(map.get('t1')).toEqual({
      fromAccountId: 'bbva',
      fromName: 'BBVA',
      toAccountId: 'mi',
      toName: 'My Investor',
      amountCents: 50000,
    })
  })

  test('si falta una pata, ese extremo queda vacío', () => {
    const map = pairTransferLegs([
      { transfer_id: 't1', account_id: 'bbva', amount_cents: -50000, accountName: 'BBVA' },
    ])
    expect(map.get('t1')).toMatchObject({ fromName: 'BBVA', toAccountId: null, toName: null })
  })
})

describe('isHiddenTransferLeg', () => {
  const out = { transfer_id: 't1', amount_cents: -50000 }
  const inn = { transfer_id: 't1', amount_cents: 50000 }
  const normal = { transfer_id: null, amount_cents: 50000 }

  test('sin filtro de cuenta se oculta la pata de entrada', () => {
    expect(isHiddenTransferLeg(out, false)).toBe(false)
    expect(isHiddenTransferLeg(inn, false)).toBe(true)
    expect(isHiddenTransferLeg(normal, false)).toBe(false)
  })

  test('filtrando por cuenta se ven todas las patas de esa cuenta', () => {
    expect(isHiddenTransferLeg(inn, true)).toBe(false)
  })
})
