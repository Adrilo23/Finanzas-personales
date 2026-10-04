'use client'

import { Trash2Icon } from 'lucide-react'
import { deleteAccount } from './actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function DeleteAccountButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDialog
      title={name ? `¿Eliminar «${name}»?` : '¿Eliminar esta cuenta?'}
      description="Se borrarán también, de forma permanente, todos sus movimientos asociados. Esta acción no se puede deshacer."
      confirmLabel="Eliminar cuenta"
      onConfirm={() => deleteAccount(id)}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Eliminar cuenta ${name}`}
          className="-mt-1 -mr-1 text-muted-foreground hover:bg-negative-soft hover:text-negative"
        >
          <Trash2Icon />
        </Button>
      }
    />
  )
}
