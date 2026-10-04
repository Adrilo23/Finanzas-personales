'use client'

import { Trash2Icon } from 'lucide-react'
import { deleteBudget } from './actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function DeleteBudgetButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDialog
      title={`¿Eliminar el presupuesto de «${name}»?`}
      description="La categoría y sus movimientos no cambian; solo deja de tener límite mensual."
      confirmLabel="Eliminar presupuesto"
      onConfirm={() => deleteBudget(id)}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Eliminar presupuesto de ${name}`}
          className="text-muted-foreground hover:bg-negative-soft hover:text-negative"
        >
          <Trash2Icon />
        </Button>
      }
    />
  )
}
