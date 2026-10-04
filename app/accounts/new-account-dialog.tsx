'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import { accountSchema, type AccountInput } from '@/lib/validation/account-schemas'
import { parseEurosInput } from '@/lib/money'
import { createAccount } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AmountInput } from '@/components/ui/amount-input'
import { Segmented } from '@/components/ui/segmented'
import { Field, FieldError, FieldHint, FormError } from '@/components/ui/field'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const TYPE_OPTIONS = [
  { value: 'bank', label: 'Banco' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'other', label: 'Otro' },
] as const

export function NewAccountDialog() {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: { type: 'bank', currency: 'EUR' },
  })

  const type = useWatch({ control, name: 'type' })

  const onSubmit = async (data: AccountInput) => {
    setServerError(null)
    const formData = new FormData()
    formData.set('name', data.name)
    formData.set('type', data.type)
    formData.set('currency', data.currency)
    formData.set('initialBalance', String(data.initialBalance))

    const result = await createAccount(formData)
    if (result?.error) {
      setServerError(result.error)
      return
    }
    reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setServerError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Nueva cuenta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cuenta</DialogTitle>
          <DialogDescription>El saldo se irá actualizando con cada movimiento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <Field>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Ej. Cuenta nómina"
              autoFocus
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <Field>
            <Label>Tipo</Label>
            <Segmented
              name="type"
              aria-label="Tipo de cuenta"
              value={type}
              onValueChange={(value) => setValue('type', value)}
              options={TYPE_OPTIONS}
            />
          </Field>

          <Field>
            <Label htmlFor="initialBalance">Saldo inicial</Label>
            <AmountInput
              id="initialBalance"
              aria-invalid={!!errors.initialBalance}
              {...register('initialBalance', { setValueAs: parseEurosInput })}
            />
            <FieldHint>Lo que tiene la cuenta hoy, antes de registrar movimientos.</FieldHint>
            <FieldError>{errors.initialBalance?.message}</FieldError>
          </Field>

          <FormError>{serverError}</FormError>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Crear cuenta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
