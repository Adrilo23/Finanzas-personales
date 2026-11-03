'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import { goalSchema, type GoalInput } from '@/lib/validation/goal-schemas'
import { centsToEuros, parseEurosInput } from '@/lib/money'
import { saveGoal } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AmountInput } from '@/components/ui/amount-input'
import { NativeSelect } from '@/components/ui/native-select'
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

export type GoalInitial = {
  id: string
  name: string
  icon: string | null
  targetCents: number
  targetDate: string | null
  accountId: string | null
}

export type GoalAccountOption = { id: string; name: string }

/** Crear o editar un objetivo de ahorro. Con `initial` edita; sin él, crea. */
export function GoalDialog({
  initial,
  accounts,
  trigger,
}: {
  initial?: GoalInitial
  accounts: GoalAccountOption[]
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const defaults = (): Partial<GoalInput> => ({
    name: initial?.name ?? '',
    icon: initial?.icon ?? '',
    target: initial ? centsToEuros(initial.targetCents) : undefined,
    targetDate: initial?.targetDate ?? '',
    accountId: initial?.accountId ?? '',
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalInput>({ resolver: zodResolver(goalSchema), defaultValues: defaults() })

  const onSubmit = async (data: GoalInput) => {
    setServerError(null)
    const formData = new FormData()
    if (initial) formData.set('id', initial.id)
    formData.set('name', data.name)
    formData.set('icon', data.icon ?? '')
    formData.set('target', String(data.target))
    formData.set('targetDate', data.targetDate)
    formData.set('accountId', data.accountId)

    const result = await saveGoal(formData)
    if (result?.error) {
      setServerError(result.error)
      return
    }
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) reset(defaults())
        else setServerError(null)
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PlusIcon data-icon="inline-start" />
            Nuevo objetivo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar objetivo' : 'Nuevo objetivo de ahorro'}</DialogTitle>
          <DialogDescription>
            Ponle nombre, una cantidad y, si quieres, una fecha. El progreso sale de las
            aportaciones que registres o del saldo de una cuenta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_5rem]">
            <Field>
              <Label htmlFor="goal-name">Nombre</Label>
              <Input
                id="goal-name"
                autoFocus
                placeholder="Viaje, fondo de emergencia…"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="goal-icon">Icono</Label>
              <Input
                id="goal-icon"
                maxLength={8}
                placeholder="✈️"
                aria-invalid={!!errors.icon}
                {...register('icon')}
              />
            </Field>
          </div>

          <Field>
            <Label htmlFor="goal-target">Cantidad a ahorrar</Label>
            <AmountInput
              id="goal-target"
              aria-invalid={!!errors.target}
              {...register('target', { setValueAs: parseEurosInput })}
            />
            <FieldError>{errors.target?.message}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="goal-date">Fecha objetivo (opcional)</Label>
            <Input id="goal-date" type="date" {...register('targetDate')} />
            <FieldHint>Con fecha te decimos cuánto aportar al mes y si vas a tiempo.</FieldHint>
            <FieldError>{errors.targetDate?.message}</FieldError>
          </Field>

          {accounts.length > 0 && (
            <Field>
              <Label htmlFor="goal-account">Cuenta vinculada (opcional)</Label>
              <NativeSelect id="goal-account" {...register('accountId')}>
                <option value="">Ninguna: registro las aportaciones a mano</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldHint>
                Si apartas el dinero en una cuenta propia, el progreso será su saldo y no hará
                falta anotar aportaciones.
              </FieldHint>
            </Field>
          )}

          <FormError>{serverError}</FormError>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear objetivo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
