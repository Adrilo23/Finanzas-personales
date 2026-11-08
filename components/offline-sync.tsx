'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { CloudOffIcon, RefreshCwIcon } from 'lucide-react'
import { createTransaction } from '@/app/transactions/actions'
import { Button } from '@/components/ui/button'
import { Amount } from '@/components/amount'
import { eurosToCents } from '@/lib/money'
import {
  flushQueue,
  idbStore,
  notifyQueueChanged,
  pendingFor,
  QUEUE_CHANGED_EVENT,
  setQueueUser,
  toFormData,
  type QueuedMovement,
} from '@/lib/offline-queue'

function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/**
 * Sincroniza la cola de movimientos guardados sin conexión: al abrir la app, al volver la
 * conexión y al volver a la pestaña. Muestra cuántos esperan y los que el servidor
 * rechazó (que el usuario debe descartar o rehacer).
 */
export function OfflineSync({ userId }: { userId: string }) {
  const router = useRouter()
  const [waiting, setWaiting] = useState<QueuedMovement[]>([])
  const [rejected, setRejected] = useState<QueuedMovement[]>([])
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  const flushing = useRef(false)

  const reload = useCallback(async () => {
    try {
      const pending = pendingFor(await idbStore.list(), userId)
      setWaiting(pending.waiting)
      setRejected(pending.rejected)
    } catch {
      // Sin IndexedDB no hay cola: no hay nada que mostrar.
    }
  }, [userId])

  const sync = useCallback(async () => {
    if (flushing.current) return
    if (!navigator.onLine) {
      await reload()
      return
    }
    flushing.current = true
    try {
      const result = await flushQueue(idbStore, userId, (item) => createTransaction(toFormData(item)))
      if (result.sent > 0) router.refresh()
    } catch {
      // IndexedDB no disponible: se reintentará en el siguiente evento.
    } finally {
      flushing.current = false
      await reload()
    }
  }, [userId, router, reload])

  useEffect(() => {
    setQueueUser(userId)
    // Diferido: la primera sincronización actualiza estado y no debe hacerlo dentro del efecto.
    const first = setTimeout(() => void sync(), 0)

    const onOnline = () => void sync()
    const onVisible = () => document.visibilityState === 'visible' && void sync()
    const onChanged = () => void sync()

    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(QUEUE_CHANGED_EVENT, onChanged)
    return () => {
      clearTimeout(first)
      setQueueUser(null)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(QUEUE_CHANGED_EVENT, onChanged)
    }
  }, [userId, sync])

  const discard = async (clientId: string) => {
    try {
      await idbStore.remove(clientId)
    } finally {
      notifyQueueChanged()
    }
  }

  if (waiting.length === 0 && rejected.length === 0 && online) return null

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 px-4 pt-3 sm:px-6" role="status">
      {!online && (
        <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm">
          <CloudOffIcon aria-hidden className="size-4 shrink-0 text-warning" />
          Sin conexión. Puedes registrar gastos e ingresos: se guardarán al volver.
        </p>
      )}
      {waiting.length > 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <RefreshCwIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {waiting.length === 1
            ? '1 movimiento pendiente de sincronizar'
            : `${waiting.length} movimientos pendientes de sincronizar`}
        </p>
      )}
      {rejected.map((item) => (
        <div
          key={item.clientId}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-warning-soft px-3 py-2 text-sm"
        >
          <p className="min-w-0">
            <span className="font-medium">No se pudo guardar</span>{' '}
            {item.description || 'un movimiento'} (
            <Amount cents={eurosToCents(item.amount)} />
            ): {item.error}
          </p>
          <Button size="sm" variant="outline" onClick={() => discard(item.clientId)}>
            Descartar
          </Button>
        </div>
      ))}
    </div>
  )
}
