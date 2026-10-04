import { describe, expect, test } from 'vitest'
import { computeDueDates, isSupportedFrequency } from './recurring'

describe('computeDueDates', () => {
  test('nada vencido si la próxima fecha es futura', () => {
    expect(computeDueDates('2026-10-10', 'monthly', '2026-10-04')).toEqual({
      dates: [],
      next: '2026-10-10',
    })
  })

  test('vence el mismo día', () => {
    expect(computeDueDates('2026-10-04', 'monthly', '2026-10-04')).toEqual({
      dates: ['2026-10-04'],
      next: '2026-11-04',
    })
  })

  test('recupera varios periodos si no se abrió la app en un tiempo', () => {
    expect(computeDueDates('2026-07-01', 'monthly', '2026-10-04')).toEqual({
      dates: ['2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'],
      next: '2026-11-01',
    })
  })

  test('semanal', () => {
    expect(computeDueDates('2026-09-20', 'weekly', '2026-10-04')).toEqual({
      dates: ['2026-09-20', '2026-09-27', '2026-10-04'],
      next: '2026-10-11',
    })
  })

  test('anual', () => {
    expect(computeDueDates('2025-03-15', 'yearly', '2026-10-04')).toEqual({
      dates: ['2025-03-15', '2026-03-15'],
      next: '2027-03-15',
    })
  })

  test('un día 31 no deriva a 28 después de febrero dentro de la misma generación', () => {
    expect(computeDueDates('2026-01-31', 'monthly', '2026-05-01')).toEqual({
      dates: ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'],
      next: '2026-05-31',
    })
  })

  test('29 de febrero anual cae en 28 los años no bisiestos', () => {
    expect(computeDueDates('2024-02-29', 'yearly', '2026-10-04').dates).toEqual([
      '2024-02-29',
      '2025-02-28',
      '2026-02-28',
    ])
  })
})

describe('isSupportedFrequency', () => {
  test('custom existe en el esquema pero se ignora', () => {
    expect(isSupportedFrequency('monthly')).toBe(true)
    expect(isSupportedFrequency('custom')).toBe(false)
  })
})
