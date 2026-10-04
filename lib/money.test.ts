import { describe, expect, test } from 'vitest'
import {
  applyCategorySign,
  centsToEuros,
  eurosToCents,
  formatCents,
  parseEurosInput,
} from './money'

// Intl usa espacio duro (U+00A0) antes del €; lo normalizamos para comparar.
const fmt = (cents: number) => formatCents(cents).replace(/ /g, ' ')

describe('eurosToCents', () => {
  test('convierte importes habituales', () => {
    expect(eurosToCents(12.5)).toBe(1250)
    expect(eurosToCents(19.99)).toBe(1999)
    expect(eurosToCents(0)).toBe(0)
  })

  test('no arrastra errores de coma flotante', () => {
    expect(0.1 + 0.2).not.toBe(0.3) // el problema que evitamos
    expect(eurosToCents(0.1 + 0.2)).toBe(30)
    expect(eurosToCents(1.15)).toBe(115) // 1.15 * 100 = 114.99999999999999
    expect(eurosToCents(4.35)).toBe(435)
  })

  test('es la inversa de centsToEuros', () => {
    for (const cents of [1, 99, 1250, 123456, 999999]) {
      expect(eurosToCents(centsToEuros(cents))).toBe(cents)
    }
  })
})

describe('parseEurosInput', () => {
  test.each([
    ['12,50', 12.5],
    ['12.5', 12.5],
    ['12', 12],
    ['0,99', 0.99],
    [' 12,50 € ', 12.5],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['1.500', 1500],
    ['12.345.678', 12345678],
    ['1234.56', 1234.56],
  ])('"%s" → %d', (input, expected) => {
    expect(parseEurosInput(input)).toBe(expected)
  })

  test.each([[''], ['   '], ['abc'], ['12,5,0'], ['1.2.3'], [null], [undefined]])(
    'entrada inválida %j → 0',
    (input) => {
      expect(parseEurosInput(input)).toBe(0)
    }
  )

  test('deja pasar los números tal cual', () => {
    expect(parseEurosInput(42.1)).toBe(42.1)
  })

  test('de punta a punta: lo que escribe el usuario acaba en céntimos exactos', () => {
    expect(eurosToCents(parseEurosInput('1.234,56'))).toBe(123456)
    expect(eurosToCents(parseEurosInput('0,1'))).toBe(10)
  })
})

describe('applyCategorySign', () => {
  test('los ingresos son positivos', () => {
    expect(applyCategorySign(1250, 'income')).toBe(1250)
    expect(applyCategorySign(-1250, 'income')).toBe(1250)
  })

  test('gastos, inversión y sin categoría son negativos', () => {
    expect(applyCategorySign(1250, 'expense')).toBe(-1250)
    expect(applyCategorySign(1250, 'investment')).toBe(-1250)
    expect(applyCategorySign(1250, null)).toBe(-1250)
    expect(applyCategorySign(-1250, 'expense')).toBe(-1250)
  })
})

describe('formatCents', () => {
  test('formatea en euros con el estilo español', () => {
    expect(fmt(123456)).toBe('1234,56 €')
    expect(fmt(1234567)).toBe('12.345,67 €')
    expect(fmt(-1250)).toBe('-12,50 €')
    expect(fmt(5)).toBe('0,05 €')
  })
})
