'use client'

import { useTransition } from 'react'
import { deleteCategory } from './actions'
import { Button } from '@/components/ui/button'

export function DeleteCategoryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm('¿Eliminar esta categoría? Sus movimientos quedarán sin categoría.')) return
        startTransition(async () => {
          await deleteCategory(id)
        })
      }}
    >
      Eliminar
    </Button>
  )
}
