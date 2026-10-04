'use client'

import { useState } from 'react'
import { centsToEuros, formatCents, parseEurosInput } from '@/lib/money'
import { parseUnitsInput } from '@/lib/investments'
import { formatShortDate } from '@/lib/format'
import { confirmOperation } from './actions'
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

/** Confirmar una compra generada por un plan de aportación con los datos reales del bróker. */
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
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    const formData = new FormData()
    formData.set('units', String(parseUnitsInput(units)))
    formData.set('amount', String(parseEurosInput(amount)))
    const result = await confirmOperation(operationId, accountId, formData)
    setPending(false)
    if (result?.error) {
      setError(result.error)
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
          // Parte de lo estimado: si coincide con el bróker, basta con confirmar.
          setUnits(estimatedUnits ? String(estimatedUnits).replace('.', ',') : '')
          setAmount(String(centsToEuros(amountCents)).replace('.', ','))
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="xs">Confirmar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar compra</DialogTitle>
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
              onChange={(e) => setUnits(e.target.value)}
              autoFocus
            />
            <FieldHint>
              {estimatedUnits
                ? 'Estimadas con el último precio. Corrígelas con las que indique tu bróker.'
                : 'No había precio para estimarlas: cópialas de tu bróker.'}
            </FieldHint>
          </Field>
          <Field>
            <Label htmlFor="confirm-amount">Importe</Label>
            <AmountInput
              id="confirm-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <FormError>{error}</FormError>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Confirmar compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
