import { describe, expect, it } from 'vitest'
import { eurosToCents } from '@/lib/money'
import { transactionSchema, transferSchema } from './transaction-schemas'
import {
  hasAtMostTwoDecimals,
  MAX_AMOUNT_EUROS,
  nonNegativeAmount,
  positiveAmount,
} from './money-schemas'

const ok = (v: number) => positiveAmount.safeParse(v).success

describe('positiveAmount', () => {
  it('acepta importes con céntimos exactos', () => {
    for (const v of [0.01, 1, 12.5, 1234.56, 0.1 + 0.2, MAX_AMOUNT_EUROS]) expect(ok(v)).toBe(true)
  })

  it('rechaza lo que acabaría en 0 céntimos o sin sentido (auditoría F-05)', () => {
    for (const v of [0.00001, 0.004, 0.005, 1.001, 0, -1, NaN, Infinity]) expect(ok(v)).toBe(false)
  })

  it('rechaza importes por encima del tope', () => {
    expect(ok(MAX_AMOUNT_EUROS + 0.01)).toBe(false)
  })

  it('todo lo aceptado se convierte en al menos 1 céntimo', () => {
    for (const v of [0.01, 0.1 + 0.2, 99.99]) expect(eurosToCents(v)).toBeGreaterThanOrEqual(1)
  })
})

describe('nonNegativeAmount', () => {
  it('admite 0 y rechaza negativos y subcéntimos', () => {
    expect(nonNegativeAmount.safeParse(0).success).toBe(true)
    expect(nonNegativeAmount.safeParse(-0.01).success).toBe(false)
    expect(nonNegativeAmount.safeParse(0.001).success).toBe(false)
  })
})

describe('hasAtMostTwoDecimals', () => {
  it('tolera el ruido de coma flotante', () => {
    expect(hasAtMostTwoDecimals(0.1 + 0.2)).toBe(true)
    expect(hasAtMostTwoDecimals(19.99)).toBe(true)
    expect(hasAtMostTwoDecimals(19.999)).toBe(false)
  })
})

describe('esquemas de movimientos', () => {
  const ids = {
    a: '11111111-1111-4111-8111-111111111111',
    b: '22222222-2222-4222-8222-222222222222',
  }

  it('movimiento con importe subcéntimo rechazado', () => {
    const r = transactionSchema.safeParse({
      accountId: ids.a,
      categoryId: ids.b,
      amount: 0.00001,
      transactionDate: '2026-11-03',
    })
    expect(r.success).toBe(false)
  })

  it('traspaso por encima del tope rechazado', () => {
    const r = transferSchema.safeParse({
      fromAccountId: ids.a,
      toAccountId: ids.b,
      amount: MAX_AMOUNT_EUROS * 2,
      transactionDate: '2026-11-03',
    })
    expect(r.success).toBe(false)
  })
})
