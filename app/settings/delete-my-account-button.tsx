'use client'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { deleteMyAccount } from './actions'

export function DeleteMyAccountButton() {
  return (
    <ConfirmDialog
      title="¿Eliminar tu cuenta y todos tus datos?"
      description="Se borrarán de forma permanente tus cuentas, movimientos, presupuestos, objetivos, adjuntos y tu usuario. No se puede deshacer: descarga antes lo que quieras conservar."
      confirmLabel="Eliminar todo"
      onConfirm={() => deleteMyAccount()}
      trigger={<Button variant="destructive">Eliminar mi cuenta</Button>}
    />
  )
}
