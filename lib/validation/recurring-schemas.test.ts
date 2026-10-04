import { describe, expect, test } from 'vitest'
import { recurringSchema } from './recurring-schemas'

const valid = {
  accountId: '6f1c1b2e-7c1a-4b8e-9f00-1a2b3c4d5e6f',
  categoryId: '7a2d2c3f-8d2b-4c9f-a011-2b3c4d5e6f70',
  amount: 850,
  frequency: 'monthly',
  nextRunDate: '2026-10-31',
}

describe('recurringSchema', () => {
  test('acepta una regla válida', () => {
    expect(recurringSchema.safeParse(valid).success).toBe(true)
  })

  test.each(['', '31/10/2026', '2026-1-5', 'mañana'])('rechaza la fecha %j', (nextRunDate) => {
    expect(recurringSchema.safeParse({ ...valid, nextRunDate }).success).toBe(false)
  })

  test('rechaza importes no positivos', () => {
    expect(recurringSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false)
  })
})

import { transferSchema } from './transaction-schemas'

describe('transferSchema', () => {
  const ok = {
    fromAccountId: '6f1c1b2e-7c1a-4b8e-9f00-1a2b3c4d5e6f',
    toAccountId: '7a2d2c3f-8d2b-4c9f-a011-2b3c4d5e6f70',
    amount: 500,
    transactionDate: '2026-10-05',
  }

  test('acepta un traspaso válido', () => {
    expect(transferSchema.safeParse(ok).success).toBe(true)
  })

  test('origen y destino deben ser distintos', () => {
    const result = transferSchema.safeParse({ ...ok, toAccountId: ok.fromAccountId })
    expect(result.success).toBe(false)
  })
})
