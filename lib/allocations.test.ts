import { describe, expect, test } from 'vitest'
import { unallocatedCents, validateAllocations } from './allocations'

// El plan real: 500 € de BBVA a My Investor; 300 MSCI World, 150 Emergentes, 50 BTC (Kraken).
const plan = [
  { holdingId: 'msci', amountCents: 30000 },
  { holdingId: 'em', amountCents: 15000 },
  { holdingId: 'btc', amountCents: 5000 },
]

describe('validateAllocations', () => {
  test('un reparto que suma exactamente el traspaso es válido', () => {
    expect(validateAllocations(50000, plan)).toBeNull()
  })

  test('puede repartir menos: el resto queda como efectivo', () => {
    expect(validateAllocations(50000, plan.slice(0, 2))).toBeNull()
    expect(unallocatedCents(50000, plan.slice(0, 2))).toBe(5000)
  })

  test('sin reparto también es válido (traspaso simple)', () => {
    expect(validateAllocations(50000, [])).toBeNull()
  })

  test('no puede repartir más de lo que se traspasa', () => {
    expect(validateAllocations(40000, plan)).toMatch(/suma más/)
  })

  test('rechaza activos repetidos, líneas vacías e importes no positivos', () => {
    expect(validateAllocations(50000, [plan[0], plan[0]])).toMatch(/repetido/)
    expect(validateAllocations(50000, [{ holdingId: '', amountCents: 100 }])).toMatch(/Elige/)
    expect(validateAllocations(50000, [{ holdingId: 'msci', amountCents: 0 }])).toMatch(
      /mayor que 0/
    )
    expect(validateAllocations(50000, [{ holdingId: 'msci', amountCents: 10.5 }])).toMatch(
      /mayor que 0/
    )
  })
})
