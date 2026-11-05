import { describe, expect, it } from 'vitest'
import { niceAxis } from './chart-axis'

describe('niceAxis', () => {
  it('usa marcas redondas', () => {
    expect(niceAxis([3_750, 1_200, 800])).toEqual({ domain: [0, 4_000], ticks: [0, 1_000, 2_000, 3_000, 4_000] })
  })

  it('no exagera un bache negativo pequeño', () => {
    const { domain, ticks } = niceAxis([3_750, -50])
    expect(domain[0]).toBeCloseTo(-57.5)
    expect(domain[1]).toBe(4_000)
    expect(ticks[0]).toBe(0)
  })

  it('baja a la marca siguiente si el negativo es grande', () => {
    expect(niceAxis([2_500, -1_400])).toEqual({
      domain: [-2_000, 3_000],
      ticks: [-2_000, -1_000, 0, 1_000, 2_000, 3_000],
    })
  })

  it('acepta pasos de 2,5', () => {
    expect(niceAxis([9_000]).ticks).toEqual([0, 2_500, 5_000, 7_500, 10_000])
  })

  it('sin datos devuelve un eje mínimo', () => {
    expect(niceAxis([])).toEqual({ domain: [0, 1], ticks: [0] })
  })
})
