'use client'

import { Trash2Icon } from 'lucide-react'
import { deleteContribution, deleteGoal } from './actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function DeleteGoalButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDialog
      title={`¿Eliminar el objetivo «${name}»?`}
      description="Se borran también sus aportaciones. Tus cuentas y movimientos no cambian."
      confirmLabel="Eliminar objetivo"
      onConfirm={() => deleteGoal(id)}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Eliminar objetivo ${name}`}
          className="text-muted-foreground hover:bg-negative-soft hover:text-negative"
        >
          <Trash2Icon />
        </Button>
      }
    />
  )
}

export function DeleteContributionButton({ id }: { id: string }) {
  return (
    <ConfirmDialog
      title="¿Eliminar esta aportación?"
      description="El objetivo volverá a restar esa cantidad de lo ahorrado."
      confirmLabel="Eliminar"
      onConfirm={() => deleteContribution(id)}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Eliminar aportación"
          className="text-muted-foreground hover:bg-negative-soft hover:text-negative"
        >
          <Trash2Icon />
        </Button>
      }
    />
  )
}
