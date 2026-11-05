import { describe, expect, test } from 'vitest'
import {
  applyWithholding,
  computeInterestPayments,
  firstOfNextMonth,
  interestDescription,
  interestPeriod,
  monthlyInterestCents,
} from './interest'

// 10.000 € al 3 % anual: 300 € al año, 0,8219 € al día (base 365).
const base = { ratePercent: 3, initialCents: 1_000_000, movements: [] }
/** Interés bruto de `days` días sobre `cents` al 3 %, base 365. */
const accrued = (cents: number, days: number) => Math.round((cents * days * 0.03) / 365)

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
  test('devenga día a día, base 365: octubre (31 días) paga 31/365 del año, no 1/12', () => {
    expect(monthlyInterestCents({ ...base, paymentDate: '2026-11-01' })).toBe(accrued(1_000_000, 31))
    expect(monthlyInterestCents({ ...base, paymentDate: '2026-11-01' })).toBe(2548)
    // Febrero de 2027 (28 días) paga menos que octubre.
    expect(monthlyInterestCents({ ...base, paymentDate: '2027-03-01' })).toBe(accrued(1_000_000, 28))
  })

  test('usa el saldo medio diario: un ingreso a mitad de mes cuenta solo los días que está', () => {
    // 10.000 € ingresados el 16 de octubre: 16 de 31 días.
    const cents = monthlyInterestCents({
      ...base,
      initialCents: 0,
      paymentDate: '2026-11-01',
      movements: [{ date: '2026-10-16', cents: 1_000_000 }],
    })
    expect(cents).toBe(accrued(1_000_000, 16))
  })

  test('los movimientos anteriores al mes forman el saldo de partida', () => {
    const cents = monthlyInterestCents({
      ...base,
      initialCents: 0,
      paymentDate: '2026-11-01',
      movements: [{ date: '2026-09-10', cents: 1_000_000 }],
    })
    expect(cents).toBe(2548)
  })

  test('los días anteriores a abrir la cuenta no cuentan', () => {
    const cents = monthlyInterestCents({
      ...base,
      paymentDate: '2026-11-01',
      openedOn: '2026-10-16',
    })
    expect(cents).toBe(accrued(1_000_000, 16))
  })

  test('ignora los movimientos posteriores al mes y no paga sobre saldo negativo', () => {
    expect(
      monthlyInterestCents({
        ...base,
        paymentDate: '2026-11-01',
        movements: [{ date: '2026-11-01', cents: 5_000_000 }],
      })
    ).toBe(2548)
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

  test('si la app no se abre en meses, abona cada mes el neto y el neto se acumula', () => {
    const { payments, next } = computeInterestPayments({
      ...base,
      nextDate: '2026-11-01',
      today: '2027-01-15',
    })
    expect(next).toBe('2027-02-01')
    expect(payments.map((p) => p.date)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01'])
    // Octubre: 25,48 € brutos, 4,85 € de retención (19 %, hacia arriba), 20,63 € netos.
    expect(payments[0]).toEqual({ date: '2026-11-01', grossCents: 2548, taxCents: 485, cents: 2063 })
    // Noviembre (30 días) devenga sobre 10.020,63 €: el neto de octubre ya está en la cuenta.
    expect(payments[1].grossCents).toBe(accrued(1_002_063, 30))
    expect(payments[1].cents).toBe(payments[1].grossCents - payments[1].taxCents)
  })
})

describe('retención', () => {
  test('caso real (Trade Republic, octubre 2026): 13,76 € brutos → 2,62 € de retención → 11,14 € netos', () => {
    expect(applyWithholding(1376)).toEqual({ grossCents: 1376, taxCents: 262, netCents: 1114 })
  })

  test('5.405,75 € al 3 % en octubre: el cálculo se queda a 1 céntimo del extracto', () => {
    const gross = monthlyInterestCents({
      paymentDate: '2026-11-01',
      ratePercent: 3,
      initialCents: 540_575,
      movements: [],
    })
    expect(Math.abs(gross - 1376)).toBeLessThanOrEqual(1)
    expect(Math.abs(applyWithholding(gross).netCents - 1114)).toBeLessThanOrEqual(1)
  })

  test('un resultado exacto no sube un céntimo por coma flotante; sin interés, sin retención', () => {
    expect(applyWithholding(10_000).taxCents).toBe(1900)
    expect(applyWithholding(0)).toEqual({ grossCents: 0, taxCents: 0, netCents: 0 })
    expect(applyWithholding(1)).toEqual({ grossCents: 1, taxCents: 1, netCents: 0 })
  })

  test('la descripción guarda el bruto y la retención', () => {
    expect(interestDescription({ date: '2026-11-01', grossCents: 1376, taxCents: 262, cents: 1114 })).toMatch(
      /^Intereses de octubre de 2026 · 13,76\s€ brutos − 2,62\s€ de retención \(19 %\)$/
    )
  })
})
