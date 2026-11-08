'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { deleteMyAccount } from './actions'

export function DeleteMyAccountButton() {
  const [password, setPassword] = useState('')

  return (
    <ConfirmDialog
      title="¿Eliminar tu cuenta y todos tus datos?"
      description={
        <>
          Se borrarán de forma permanente tus cuentas, movimientos, presupuestos, objetivos,
          adjuntos y tu usuario. No se puede deshacer: descarga antes lo que quieras conservar.
          <span className="mt-3 block">
            <label htmlFor="delete-password" className="mb-1.5 block font-medium text-foreground">
              Tu contraseña, para confirmar
            </label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </span>
        </>
      }
      confirmLabel="Eliminar todo"
      onConfirm={() => deleteMyAccount(password)}
      trigger={<Button variant="destructive">Eliminar mi cuenta</Button>}
    />
  )
}
