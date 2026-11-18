'use client'

import { useState } from 'react'
import { centsToEuros, formatCents, parseEurosInput } from '@/lib/money'
import { parseUnitsInput, priceFromUnits, unitsFromPrice } from '@/lib/investments'
import { formatShortDate } from '@/lib/format'
import { confirmOperation, updatePendingOperation } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AmountInput } from '@/components/ui/amount-input'
import { Field, FieldHint, FormError } from '@/components/ui/field'
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

const toText = (value: number | null) => (value === null ? '' : String(value).replace('.', ','))

/**
 * Revisar una compra generada por un plan de aportación: se puede ajustar (participaciones,
 * importe o precio por participación) y guardar sin confirmar, o confirmar con los datos
 * reales del bróker.
 */
export function ConfirmOperationDialog({
  operationId,
  accountId,
  holdingName,
  isCrypto,
  date,
  amountCents,
  estimatedUnits,
}: {
  operationId: string
  accountId: string
  holdingName: string
  isCrypto: boolean
  date: string
  amountCents: number
  estimatedUnits: number | null
}) {
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState('')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Importe y participaciones mandan; el precio se deriva de ellos (y al revés si se teclea el precio).
  const derivePrice = (nextUnits: string, nextAmount: string) =>
    toText(priceFromUnits(parseEurosInput(nextAmount), parseUnitsInput(nextUnits)))

  const changeUnits = (value: string) => {
    setUnits(value)
    setPrice(derivePrice(value, amount))
  }
  const changeAmount = (value: string) => {
    setAmount(value)
    setPrice(derivePrice(units, value))
  }
  const changePrice = (value: string) => {
    setPrice(value)
    const computed = unitsFromPrice(parseEurosInput(amount), parseEurosInput(value))
    if (computed !== null) setUnits(toText(computed))
  }

  const run = async (action: typeof confirmOperation) => {
    setError(null)
    setPending(true)
    const formData = new FormData()
    formData.set('units', String(parseUnitsInput(units)))
    formData.set('amount', String(parseEurosInput(amount)))
    const result = await action(operationId, accountId, formData)
    setPending(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setOpen(false)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    return run(confirmOperation)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          // Parte de lo estimado: si coincide con el bróker, basta con confirmar.
          const startUnits = estimatedUnits ? String(estimatedUnits).replace('.', ',') : ''
          const startAmount = String(centsToEuros(amountCents)).replace('.', ',')
          setUnits(startUnits)
          setAmount(startAmount)
          setPrice(derivePrice(startUnits, startAmount))
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="xs">Revisar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisar compra</DialogTitle>
          <DialogDescription className="truncate">
            {holdingName} · {formatShortDate(date)} · {formatCents(amountCents)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field>
            <Label htmlFor="confirm-units">{isCrypto ? 'Cantidad' : 'Participaciones'}</Label>
            <Input
              id="confirm-units"
              inputMode="decimal"
              autoComplete="off"
              className="num"
              value={units}
              onChange={(e) => changeUnits(e.target.value)}
              autoFocus
            />
            <FieldHint>
              {estimatedUnits
                ? 'Estimadas con el último precio. Corrígelas con las que indique tu bróker.'
                : 'No había precio para estimarlas: cópialas de tu bróker.'}
            </FieldHint>
          </Field>
          <Field>
            <Label htmlFor="confirm-price">{isCrypto ? 'Precio por unidad' : 'Precio por participación'}</Label>
            <AmountInput id="confirm-price" value={price} onChange={(e) => changePrice(e.target.value)} />
            <FieldHint>Si lo cambias, se recalculan las participaciones con el importe de abajo.</FieldHint>
          </Field>
          <Field>
            <Label htmlFor="confirm-amount">Importe</Label>
            <AmountInput
              id="confirm-amount"
              value={amount}
              onChange={(e) => changeAmount(e.target.value)}
            />
          </Field>
          <FormError>{error}</FormError>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => run(updatePendingOperation)}
            >
              Guardar sin confirmar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Confirmar compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
