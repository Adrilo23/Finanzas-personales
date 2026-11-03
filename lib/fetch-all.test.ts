import { describe, expect, it } from 'vitest'
import { fetchAllRows, PAGE_SIZE } from './fetch-all'

/** Simula una tabla de `total` filas servida por páginas como PostgREST. */
function fakeTable(total: number) {
  const calls: [number, number][] = []
  const page = async (from: number, to: number) => {
    calls.push([from, to])
    const data = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => from + i)
    return { data, error: null }
  }
  return { page, calls }
}

describe('fetchAllRows', () => {
  it('menos de una página: una sola petición', async () => {
    const t = fakeTable(10)
    expect(await fetchAllRows(t.page)).toHaveLength(10)
    expect(t.calls).toEqual([[0, PAGE_SIZE - 1]])
  })

  it('varias páginas: junta todas las filas sin repetir', async () => {
    const t = fakeTable(PAGE_SIZE * 2 + 5)
    const rows = await fetchAllRows(t.page)
    expect(rows).toHaveLength(PAGE_SIZE * 2 + 5)
    expect(new Set(rows).size).toBe(rows.length)
    expect(t.calls).toHaveLength(3)
  })

  it('múltiplo exacto: pide una página vacía más para saber que ha terminado', async () => {
    const t = fakeTable(PAGE_SIZE)
    expect(await fetchAllRows(t.page)).toHaveLength(PAGE_SIZE)
    expect(t.calls).toHaveLength(2)
  })

  it('propaga el error de la consulta', async () => {
    await expect(fetchAllRows(async () => ({ data: null, error: new Error('x') }))).rejects.toThrow('x')
  })
})
