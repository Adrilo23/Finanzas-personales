'use client'

import { useTransition } from 'react'
import { toggleRecurringRule, deleteRecurringRule } from './actions'
import { Button } from '@/components/ui/button'

export function RecurringRuleActions({ id, active }: { id: string; active: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await toggleRecurringRule(id, !active)
          })
        }}
      >
        {active ? 'Pausar' : 'Reactivar'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (!confirm('¿Eliminar esta regla recurrente? No afecta a los movimientos ya generados.'))
            return
          startTransition(async () => {
            await deleteRecurringRule(id)
          })
        }}
      >
        Eliminar
      </Button>
    </div>
  )
}
