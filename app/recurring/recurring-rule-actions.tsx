'use client'

import { useTransition } from 'react'
import { PauseIcon, PlayIcon, Trash2Icon } from 'lucide-react'
import { toggleRecurringRule, deleteRecurringRule } from './actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function RecurringRuleActions({ id, active }: { id: string; active: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        aria-label={active ? 'Pausar regla' : 'Reactivar regla'}
        title={active ? 'Pausar' : 'Reactivar'}
        className="text-muted-foreground"
        onClick={() => {
          startTransition(async () => {
            await toggleRecurringRule(id, !active)
          })
        }}
      >
        {active ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <ConfirmDialog
        title="¿Eliminar esta regla?"
        description="Dejará de generar movimientos. Los que ya se crearon se mantienen."
        confirmLabel="Eliminar regla"
        onConfirm={() => deleteRecurringRule(id)}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            aria-label="Eliminar regla"
            className="text-muted-foreground hover:bg-negative-soft hover:text-negative"
          >
            <Trash2Icon />
          </Button>
        }
      />
    </div>
  )
}
