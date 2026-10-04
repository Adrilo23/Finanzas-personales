'use client'

import { useState, useTransition } from 'react'
import { deleteAccount } from './actions'
import { Button } from '@/components/ui/button'

export function DeleteAccountButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (
            !confirm(
              'Eliminar esta cuenta borrará también, de forma permanente, todos sus movimientos asociados. Esta acción no se puede deshacer. ¿Continuar?'
            )
          )
            return
          setError(null)
          startTransition(async () => {
            const result = await deleteAccount(id)
            if (result?.error) setError(result.error)
          })
        }}
      >
        Eliminar
      </Button>
      {error && <p className="max-w-[220px] text-right text-xs text-red-500">{error}</p>}
    </div>
  )
}
