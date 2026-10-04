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

  test('un día 31 se recorta en los meses cortos y vuelve al 31 después', () => {
    expect(computeDueDates('2026-01-31', 'monthly', '2026-05-01', 31)).toEqual({
      dates: ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'],
      next: '2026-05-31',
    })
  })

  test('no deriva entre generaciones: tras guardar el 28 de febrero, marzo vuelve al 31', () => {
    // Antes de anchor_day, next_run_date quedaba en 02-28 y todos los meses siguientes caían en 28.
    expect(computeDueDates('2026-02-28', 'monthly', '2026-03-31', 31)).toEqual({
      dates: ['2026-02-28', '2026-03-31'],
      next: '2026-04-30',
    })
  })

  test('día 30: febrero en 28 (29 en bisiesto) y vuelta al 30', () => {
    expect(computeDueDates('2028-01-30', 'monthly', '2028-03-30', 30).dates).toEqual([
      '2028-01-30',
      '2028-02-29',
      '2028-03-30',
    ])
  })

  test('29 de febrero anual cae en 28 los años no bisiestos y vuelve al 29 en los bisiestos', () => {
    expect(computeDueDates('2024-02-29', 'yearly', '2028-03-01', 29)).toEqual({
      dates: ['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29'],
      next: '2029-02-28',
    })
  })

  test('sin anchor_day usa el día de la próxima fecha', () => {
    expect(computeDueDates('2026-01-15', 'monthly', '2026-03-20').dates).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
    ])
  })

  test('el semanal ignora anchor_day', () => {
    expect(computeDueDates('2026-09-27', 'weekly', '2026-10-04', 31).dates).toEqual([
      '2026-09-27',
      '2026-10-04',
    ])
  })
})

describe('isSupportedFrequency', () => {
  test('custom existe en el esquema pero se ignora', () => {
    expect(isSupportedFrequency('monthly')).toBe(true)
    expect(isSupportedFrequency('custom')).toBe(false)
  })
})
