'use client'

import { useTransition } from 'react'
import { deleteTransaction } from './actions'
import { Button } from '@/components/ui/button'

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm('¿Eliminar este movimiento?')) return
        startTransition(async () => {
          await deleteTransaction(id)
        })
      }}
    >
      Eliminar
    </Button>
  )
}
