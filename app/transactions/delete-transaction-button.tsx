'use client'

import { Trash2Icon } from 'lucide-react'
import { deleteTransaction } from './actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function DeleteTransactionButton({
  id,
  isTransfer = false,
}: {
  id: string
  isTransfer?: boolean
}) {
  return (
    <ConfirmDialog
      title={isTransfer ? '¿Eliminar este traspaso?' : '¿Eliminar este movimiento?'}
      description={
        isTransfer
          ? 'Se elimina de las dos cuentas y sus saldos vuelven a como estaban.'
          : 'Dejará de contar en los saldos y en los informes.'
      }
      onConfirm={() => deleteTransaction(id)}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Eliminar movimiento"
          className="text-muted-foreground hover:bg-negative-soft hover:text-negative"
        >
          <Trash2Icon />
        </Button>
      }
    />
  )
}
