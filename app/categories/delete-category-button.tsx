'use client'

import { Trash2Icon } from 'lucide-react'
import { deleteCategory } from './actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDialog
      title={`¿Eliminar «${name}»?`}
      description="Sus movimientos no se borran: quedarán sin categoría."
      confirmLabel="Eliminar categoría"
      onConfirm={() => deleteCategory(id)}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Eliminar categoría ${name}`}
          className="text-muted-foreground/70 hover:bg-negative-soft hover:text-negative"
        >
          <Trash2Icon />
        </Button>
      }
    />
  )
}
