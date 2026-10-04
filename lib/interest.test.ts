import { describe, expect, test } from 'vitest'
import {
  computeInterestPayments,
  firstOfNextMonth,
  interestPeriod,
  monthlyInterestCents,
} from './interest'

// 10.000 € al 3 % anual: 300 € al año, 25 € al mes.
const base = { ratePercent: 3, initialCents: 1_000_000, movements: [] }

describe('fechas de abono', () => {
  test('el primer abono es el día 1 del mes siguiente', () => {
    expect(firstOfNextMonth('2026-10-04')).toBe('2026-11-01')
    expect(firstOfNextMonth('2026-12-31')).toBe('2027-01-01')
  })

  test('cada abono paga el mes anterior completo', () => {
    expect(interestPeriod('2026-11-01')).toEqual({ start: '2026-10-01', end: '2026-10-31' })
    expect(interestPeriod('2027-03-01')).toEqual({ start: '2027-02-01', end: '2027-02-28' })
  })
})

describe('monthlyInterestCents', () => {
  test('saldo constante: % anual ÷ 12', () => {
    expect(monthlyInterestCents({ ...base, paymentDate: '2026-11-01' })).toBe(2500)
  })

  test('usa el saldo medio diario: un ingreso a mitad de mes cuenta solo los días que está', () => {
    // 10.000 € ingresados el 16 de octubre: 16 de 31 días.
    const cents = monthlyInterestCents({
      ...base,
      initialCents: 0,
      paymentDate: '2026-11-01',
      movements: [{ date: '2026-10-16', cents: 1_000_000 }],
    })
    expect(cents).toBe(Math.round((((1_000_000 * 16) / 31) * 0.03) / 12))
  })

  test('los movimientos anteriores al mes forman el saldo de partida', () => {
    const cents = monthlyInterestCents({
      ...base,
      initialCents: 0,
      paymentDate: '2026-11-01',
      movements: [{ date: '2026-09-10', cents: 1_000_000 }],
    })
    expect(cents).toBe(2500)
  })

  test('los días anteriores a abrir la cuenta no cuentan', () => {
    const cents = monthlyInterestCents({
      ...base,
      paymentDate: '2026-11-01',
      openedOn: '2026-10-16',
    })
    expect(cents).toBe(Math.round((((1_000_000 * 16) / 31) * 0.03) / 12))
  })

  test('ignora los movimientos posteriores al mes y no paga sobre saldo negativo', () => {
    expect(
      monthlyInterestCents({
        ...base,
        paymentDate: '2026-11-01',
        movements: [{ date: '2026-11-01', cents: 5_000_000 }],
      })
    ).toBe(2500)
    expect(
      monthlyInterestCents({ ...base, initialCents: -50_000, paymentDate: '2026-11-01' })
    ).toBe(0)
  })
})

describe('computeInterestPayments', () => {
  test('sin abonos vencidos no genera nada', () => {
    const result = computeInterestPayments({ ...base, nextDate: '2026-11-01', today: '2026-10-31' })
    expect(result).toEqual({ payments: [], next: '2026-11-01' })
  })

  test('si la app no se abre en meses, abona cada mes y el interés se acumula', () => {
    const { payments, next } = computeInterestPayments({
      ...base,
      nextDate: '2026-11-01',
      today: '2027-01-15',
    })
    expect(next).toBe('2027-02-01')
    expect(payments.map((p) => p.date)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01'])
    expect(payments[0].cents).toBe(2500)
    // Diciembre paga sobre 10.025 € (el abono de noviembre ya está en la cuenta).
    expect(payments[1].cents).toBe(Math.round((1_002_500 * 0.03) / 12))
    expect(payments[2].cents).toBeGreaterThan(payments[1].cents)
  })
})
