'use client'

import { Trash2Icon } from 'lucide-react'
import { deleteHolding, deleteOperation } from './actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const triggerClass = 'text-muted-foreground hover:bg-negative-soft hover:text-negative'

export function DeleteHoldingButton({
  id,
  accountId,
  name,
}: {
  id: string
  accountId: string
  name: string
}) {
  return (
    <ConfirmDialog
      title={`¿Quitar «${name}» de la cuenta?`}
      description="Se borrarán también todas sus operaciones registradas. Esta acción no se puede deshacer."
      confirmLabel="Quitar activo"
      onConfirm={() => deleteHolding(id, accountId)}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Quitar ${name}`}
          className={triggerClass}
        >
          <Trash2Icon />
        </Button>
      }
    />
  )
}

export function DeleteOperationButton({ id, accountId }: { id: string; accountId: string }) {
  return (
    <ConfirmDialog
      title="¿Eliminar esta operación?"
      description="Las participaciones y lo aportado del activo se recalcularán sin ella."
      confirmLabel="Eliminar operación"
      onConfirm={() => deleteOperation(id, accountId)}
      trigger={
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Eliminar operación"
          className={triggerClass}
        >
          <Trash2Icon />
        </Button>
      }
    />
  )
}
