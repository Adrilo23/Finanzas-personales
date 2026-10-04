import { describe, expect, test } from 'vitest'
import {
  cryptoSymbol,
  gainPercent,
  isValidIsin,
  normalizeIsin,
  parseUnitsInput,
  parseYahooChart,
  parseYahooSearch,
  roundUnits,
} from './investments'

describe('isValidIsin', () => {
  test.each(['IE00BYX5NX33', 'LU0996175948', 'FR0000989626', 'US0378331005', 'ie00 byx5 nx33'])(
    '%s es válido',
    (isin) => {
      expect(isValidIsin(isin)).toBe(true)
    }
  )

  test.each([
    ['IE00BYX5NX34', 'dígito de control incorrecto'],
    ['LU0996175949', 'dígito de control incorrecto'],
    ['IE00BYX5NX3', 'demasiado corto'],
    ['1E00BYX5NX33', 'no empieza por dos letras'],
    ['', 'vacío'],
  ])('%s no es válido (%s)', (isin) => {
    expect(isValidIsin(isin)).toBe(false)
  })

  test('normaliza espacios y minúsculas', () => {
    expect(normalizeIsin(' ie00 byx5nx33 ')).toBe('IE00BYX5NX33')
  })
})

describe('parseUnitsInput', () => {
  test.each([
    ['12,345678', 12.345678],
    ['12.345678', 12.345678],
    ['0,112345', 0.112345],
    ['1.234', 1.234], // en participaciones el punto es decimal, no de miles
    ['7', 7],
  ])('"%s" → %d', (input, expected) => {
    expect(parseUnitsInput(input)).toBe(expected)
  })

  test.each([[''], ['abc'], ['-3'], ['1,2,3']])('entrada inválida %j → 0', (input) => {
    expect(parseUnitsInput(input)).toBe(0)
  })

  test('redondea a 8 decimales', () => {
    expect(roundUnits(0.123456789)).toBe(0.12345679)
  })
})

describe('parseYahooSearch', () => {
  test('elige el primer fondo y su nombre largo', () => {
    expect(
      parseYahooSearch({
        quotes: [
          { symbol: 'XYZ', quoteType: 'INDEX' },
          {
            symbol: '0P0001CLDK.F',
            quoteType: 'MUTUALFUND',
            longname: 'Fidelity MSCI World Index EUR P Acc',
          },
        ],
      })
    ).toEqual({ symbol: '0P0001CLDK.F', name: 'Fidelity MSCI World Index EUR P Acc' })
  })

  test('sin resultados → null', () => {
    expect(parseYahooSearch({ quotes: [] })).toBeNull()
    expect(parseYahooSearch(null)).toBeNull()
  })
})

describe('parseYahooChart', () => {
  test('convierte marcas de tiempo a fechas del mercado y descarta días sin valor', () => {
    // 29 y 30 de septiembre de 2026 a las 00:00 en Fráncfort (UTC+2 en verano).
    const json = {
      chart: {
        result: [
          {
            meta: { currency: 'EUR', gmtoffset: 7200 },
            timestamp: [1790632800, 1790719200, 1790805600],
            indicators: { quote: [{ close: [14.3601, 14.3233, null] }] },
          },
        ],
      },
    }
    expect(parseYahooChart(json)).toEqual({
      currency: 'EUR',
      name: null,
      prices: [
        { date: '2026-09-29', price: 14.3601 },
        { date: '2026-09-30', price: 14.3233 },
      ],
    })
  })

  test('limpia el ruido de coma flotante de la fuente', () => {
    const json = {
      chart: {
        result: [
          {
            meta: { currency: 'EUR', gmtoffset: 0 },
            timestamp: [1790726400],
            indicators: { quote: [{ close: [14.416500091552734] }] },
          },
        ],
      },
    }
    expect(parseYahooChart(json).prices[0].price).toBe(14.4165)
  })

  test('respuesta vacía o con error', () => {
    expect(parseYahooChart({ chart: { result: null } })).toEqual({
      currency: null,
      name: null,
      prices: [],
    })
  })
})

describe('cryptoSymbol', () => {
  test.each([
    ['btc', 'BTC-EUR'],
    [' ETH ', 'ETH-EUR'],
    ['BTC-EUR', 'BTC-EUR'],
  ])('%j → %s', (input, expected) => {
    expect(cryptoSymbol(input)).toBe(expected)
  })

  test.each([[''], ['B'], ['BTC/USD'], ['bitcoin cash']])('%j no es válido', (input) => {
    expect(cryptoSymbol(input)).toBeNull()
  })
})

describe('gainPercent', () => {
  test('rentabilidad sobre lo aportado', () => {
    expect(gainPercent(15000, 100000)).toBe(15)
    expect(gainPercent(-5000, 100000)).toBe(-5)
  })

  test('sin aportación no hay porcentaje', () => {
    expect(gainPercent(0, 0)).toBeNull()
  })
})
