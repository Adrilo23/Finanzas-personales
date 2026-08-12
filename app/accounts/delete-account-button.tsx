'use client'

import { useTransition } from 'react'
import { deleteAccount } from './actions'
import { Button } from '@/components/ui/button'

export function DeleteAccountButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm('¿Eliminar esta cuenta? Esta acción no se puede deshacer.')) return
        startTransition(async () => {
          await deleteAccount(id)
        })
      }}
    >
      Eliminar
    </Button>
  )
}
