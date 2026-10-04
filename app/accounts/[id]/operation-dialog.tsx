'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { operationSchema, type OperationInput } from '@/lib/validation/investment-schemas'
import { parseEurosInput } from '@/lib/money'
import { parseUnitsInput } from '@/lib/investments'
import { addOperation } from './actions'
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

const KIND_OPTIONS = [
  { value: 'buy', label: 'Compra' },
  { value: 'sell', label: 'Venta' },
] as const

function todayISO() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Registrar una compra o venta de un activo, con las participaciones del bróker. */
export function OperationDialog({
  holdingId,
  holdingName,
  isCrypto,
  trigger,
}: {
  holdingId: string
  holdingName: string
  isCrypto: boolean
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<OperationInput['kind']>('buy')
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OperationInput>({
    resolver: zodResolver(operationSchema),
    defaultValues: { kind: 'buy', operationDate: todayISO() },
  })

  const unitsLabel = isCrypto ? 'Cantidad' : 'Participaciones'

  const onSubmit = async (data: OperationInput) => {
    setServerError(null)
    const formData = new FormData()
    formData.set('kind', data.kind)
    formData.set('operationDate', data.operationDate)
    formData.set('units', String(data.units))
    formData.set('amount', String(data.amount))
    const result = await addOperation(holdingId, formData)
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
        if (next) {
          setKind('buy')
          reset({ kind: 'buy', operationDate: todayISO() })
        } else {
          setServerError(null)
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar operación</DialogTitle>
          <DialogDescription className="truncate">{holdingName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <Segmented
            name="kind"
            aria-label="Tipo de operación"
            value={kind}
            onValueChange={(value) => {
              setKind(value)
              setValue('kind', value)
            }}
            options={KIND_OPTIONS}
          />

          <Field>
            <Label htmlFor="amount">
              {kind === 'buy' ? 'Importe invertido' : 'Importe recibido'}
            </Label>
            <AmountInput
              id="amount"
              autoFocus
              aria-invalid={!!errors.amount}
              {...register('amount', { setValueAs: parseEurosInput })}
            />
            <FieldError>{errors.amount?.message}</FieldError>
          </Field>

          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <Field>
              <Label htmlFor="units">{unitsLabel}</Label>
              <Input
                id="units"
                inputMode="decimal"
                autoComplete="off"
                placeholder={isCrypto ? '0,00065' : '12,345678'}
                className="num"
                aria-invalid={!!errors.units}
                {...register('units', { setValueAs: parseUnitsInput })}
              />
              {errors.units ? (
                <FieldError>{errors.units.message}</FieldError>
              ) : (
                <FieldHint>
                  {isCrypto
                    ? 'Cópiala de tu exchange.'
                    : 'Cópialas de tu bróker, tal como aparecen en la operación.'}
                </FieldHint>
              )}
            </Field>
            <Field>
              <Label htmlFor="operationDate">Fecha</Label>
              <Input id="operationDate" type="date" {...register('operationDate')} />
              <FieldError>{errors.operationDate?.message}</FieldError>
            </Field>
          </div>

          <FormError>{serverError}</FormError>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : kind === 'buy' ? 'Guardar compra' : 'Guardar venta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
