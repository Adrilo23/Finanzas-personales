/**
 * Cola de movimientos para registrar sin conexión. Solo gastos, ingresos e inversiones
 * nuevos: traspasos y ediciones necesitan conexión. Se guarda en IndexedDB y se envía
 * después a la Server Action `createTransaction`. Cada elemento lleva un `clientId` que
 * el servidor guarda (índice único): si un envío llega pero la respuesta se pierde, el
 * reintento no duplica el dinero.
 *
 * La parte de IndexedDB es mínima; la lógica de envío (`flushQueue`) es pura y se testea
 * con un almacén en memoria.
 */

export type QueuedMovement = {
  /** uuid generado en el navegador; el servidor lo usa para no duplicar. */
  clientId: string
  /** Dueño del movimiento: nunca se envía con la sesión de otro usuario. */
  userId: string
  accountId: string
  categoryId: string
  /** Euros, positivo (el signo lo pone el servidor). */
  amount: number
  description: string
  /** 'yyyy-MM-dd' */
  transactionDate: string
  createdAt: number
  /** Motivo por el que el servidor lo rechazó; no se reintenta hasta que se descarte. */
  error?: string
}

export interface QueueStore {
  list(): Promise<QueuedMovement[]>
  put(item: QueuedMovement): Promise<void>
  remove(clientId: string): Promise<void>
}

export type SendResult = { error?: string } | { success: true } | void

/** El servidor responde esto cuando la sesión ha caducado: se espera, no se descarta. */
export const NOT_AUTHENTICATED = 'No autenticado'

export type FlushResult = {
  sent: number
  /** Rechazados por el servidor (categoría borrada, importe no válido…). */
  failed: number
  /** Se cortó por falta de conexión o de sesión; quedan pendientes. */
  interrupted: boolean
}

/**
 * Envía en orden los movimientos del usuario. Si `send` lanza (sin red) o la sesión no es
 * válida, se detiene y deja el resto. Si el servidor rechaza uno, lo marca con su error
 * y sigue con los demás.
 */
export async function flushQueue(
  store: QueueStore,
  userId: string,
  send: (item: QueuedMovement) => Promise<SendResult>
): Promise<FlushResult> {
  const items = (await store.list())
    .filter((i) => i.userId === userId && !i.error)
    .sort((a, b) => a.createdAt - b.createdAt)

  const result: FlushResult = { sent: 0, failed: 0, interrupted: false }
  for (const item of items) {
    let response: SendResult
    try {
      response = await send(item)
    } catch {
      result.interrupted = true
      return result
    }
    const error = response && 'error' in response ? response.error : undefined
    if (!error) {
      await store.remove(item.clientId)
      result.sent++
    } else if (error === NOT_AUTHENTICATED) {
      result.interrupted = true
      return result
    } else {
      await store.put({ ...item, error })
      result.failed++
    }
  }
  return result
}

/** Movimientos del usuario que siguen en la cola. */
export function pendingFor(items: QueuedMovement[], userId: string) {
  const mine = items.filter((i) => i.userId === userId)
  return {
    waiting: mine.filter((i) => !i.error),
    rejected: mine.filter((i) => i.error),
  }
}

// --- IndexedDB -----------------------------------------------------------------------

const DB_NAME = 'finanzas-offline'
const STORE = 'movements'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'clientId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = op(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

/** Almacén real. Puede lanzar si IndexedDB no está disponible (p. ej. modo privado). */
export const idbStore: QueueStore = {
  list: () => run('readonly', (s) => s.getAll() as IDBRequest<QueuedMovement[]>),
  put: async (item) => {
    await run('readwrite', (s) => s.put(item))
  },
  remove: async (clientId) => {
    await run('readwrite', (s) => s.delete(clientId))
  },
}

/** Aviso a la interfaz (banner de pendientes) de que la cola ha cambiado. */
export const QUEUE_CHANGED_EVENT = 'finanzas:offline-queue-changed'

export function notifyQueueChanged() {
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT))
}

/** Usuario de la sesión actual, lo fija `OfflineSync` (el formulario no lo conoce). */
let currentUserId: string | null = null
export const setQueueUser = (id: string | null) => {
  currentUserId = id
}
export const getQueueUser = () => currentUserId

/** Guarda un movimiento nuevo en la cola. Devuelve false si no se pudo guardar. */
export async function enqueueMovement(
  input: Omit<QueuedMovement, 'userId' | 'createdAt'>
): Promise<boolean> {
  const userId = getQueueUser()
  if (!userId) return false
  try {
    await idbStore.put({ ...input, userId, createdAt: Date.now() })
  } catch {
    return false
  }
  notifyQueueChanged()
  return true
}

/** Convierte un elemento de la cola en el FormData que espera `createTransaction`. */
export function toFormData(item: QueuedMovement): FormData {
  const formData = new FormData()
  formData.set('clientId', item.clientId)
  formData.set('accountId', item.accountId)
  formData.set('categoryId', item.categoryId)
  formData.set('amount', String(item.amount))
  formData.set('description', item.description)
  formData.set('transactionDate', item.transactionDate)
  return formData
}
