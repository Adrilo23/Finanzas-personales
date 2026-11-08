import { describe, expect, it } from 'vitest'
import {
  flushQueue,
  NOT_AUTHENTICATED,
  pendingFor,
  type QueuedMovement,
  type QueueStore,
} from './offline-queue'

function memoryStore(initial: QueuedMovement[]): QueueStore & { items: Map<string, QueuedMovement> } {
  const items = new Map(initial.map((i) => [i.clientId, i]))
  return {
    items,
    list: async () => [...items.values()],
    put: async (item) => void items.set(item.clientId, item),
    remove: async (id) => void items.delete(id),
  }
}

const movement = (n: number, over: Partial<QueuedMovement> = {}): QueuedMovement => ({
  clientId: `id-${n}`,
  userId: 'u1',
  accountId: 'a1',
  categoryId: 'c1',
  amount: 10 * n,
  description: `mov ${n}`,
  transactionDate: '2026-11-08',
  createdAt: n,
  ...over,
})

describe('flushQueue', () => {
  it('envía en orden de creación y vacía la cola', async () => {
    const store = memoryStore([movement(2), movement(1), movement(3)])
    const sent: string[] = []
    const result = await flushQueue(store, 'u1', async (i) => {
      sent.push(i.clientId)
      return { success: true }
    })
    expect(sent).toEqual(['id-1', 'id-2', 'id-3'])
    expect(result).toEqual({ sent: 3, failed: 0, interrupted: false })
    expect(store.items.size).toBe(0)
  })

  it('sin red se detiene y conserva todo lo pendiente', async () => {
    const store = memoryStore([movement(1), movement(2), movement(3)])
    let calls = 0
    const result = await flushQueue(store, 'u1', async () => {
      calls++
      if (calls === 2) throw new TypeError('Failed to fetch')
      return { success: true }
    })
    expect(result).toEqual({ sent: 1, failed: 0, interrupted: true })
    expect([...store.items.keys()]).toEqual(['id-2', 'id-3'])
  })

  it('si el servidor rechaza uno, lo marca y sigue con los demás', async () => {
    const store = memoryStore([movement(1), movement(2)])
    const result = await flushQueue(store, 'u1', async (i) =>
      i.clientId === 'id-1' ? { error: 'Categoría no válida' } : { success: true }
    )
    expect(result).toEqual({ sent: 1, failed: 1, interrupted: false })
    expect(store.items.get('id-1')?.error).toBe('Categoría no válida')
    expect(store.items.has('id-2')).toBe(false)
  })

  it('con la sesión caducada espera: no descarta ni marca nada', async () => {
    const store = memoryStore([movement(1), movement(2)])
    const result = await flushQueue(store, 'u1', async () => ({ error: NOT_AUTHENTICATED }))
    expect(result).toEqual({ sent: 0, failed: 0, interrupted: true })
    expect(store.items.size).toBe(2)
    expect(store.items.get('id-1')?.error).toBeUndefined()
  })

  it('no envía lo de otro usuario ni lo ya rechazado', async () => {
    const store = memoryStore([
      movement(1, { userId: 'u2' }),
      movement(2, { error: 'Cuenta no válida' }),
      movement(3),
    ])
    const sent: string[] = []
    await flushQueue(store, 'u1', async (i) => {
      sent.push(i.clientId)
      return { success: true }
    })
    expect(sent).toEqual(['id-3'])
    expect(store.items.has('id-1')).toBe(true)
    expect(store.items.has('id-2')).toBe(true)
  })
})

describe('pendingFor', () => {
  it('separa esperando y rechazados, solo del usuario', () => {
    const items = [movement(1), movement(2, { error: 'x' }), movement(3, { userId: 'u2' })]
    const { waiting, rejected } = pendingFor(items, 'u1')
    expect(waiting.map((i) => i.clientId)).toEqual(['id-1'])
    expect(rejected.map((i) => i.clientId)).toEqual(['id-2'])
  })
})
