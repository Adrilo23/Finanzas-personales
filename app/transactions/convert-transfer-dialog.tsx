'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightLeftIcon, TriangleAlertIcon } from 'lucide-react'
import { z } from 'zod'
import { convertToTransferSchema } from '@/lib/validation/transaction-schemas'
import { transferTargets, type TransferTarget } from '@/lib/transfers'
import { convertToTransfer } from './actions'
import { Amount } from '@/components/amount'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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

const formSchema = convertToTransferSchema.pick({ toAccountId: true })
type FormInput = z.infer<typeof formSchema>

/**
 * «Convertir en traspaso» para los movimientos de inversión registrados antes de que
 * existieran los traspasos (p. ej. una aportación al bróker anotada como inversión).
 * Pinta su propio botón (ver nota de Radix asChild en CLAUDE.md).
 */
export function ConvertTransferDialog({
  transactionId,
  fromAccountId,
  fromAccountName,
  amountCents,
  label,
  accounts,
}: {
  transactionId: string
  fromAccountId: string
  fromAccountName: string | null
  amountCents: number
  label: string
  accounts: TransferTarget[]
}) {
  const targets = transferTargets(accounts, fromAccountId)
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { toAccountId: targets[0]?.id ?? '' },
  })

  const toAccountId = useWatch({ control, name: 'toAccountId' })
  const selected = targets.find((a) => a.id === toAccountId)

  const onSubmit = async (data: FormInput) => {
    setServerError(null)
    const formData = new FormData()
    formData.set('transactionId', transactionId)
    formData.set('toAccountId', data.toAccountId)
    const result = await convertToTransfer(formData)
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
        if (next) reset({ toAccountId: targets[0]?.id ?? '' })
        else setServerError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Convertir en traspaso ${label}`}
          title="Convertir en traspaso"
          className="text-muted-foreground"
        >
          <ArrowRightLeftIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convertir en traspaso</DialogTitle>
          <DialogDescription>
            Si este dinero fue a una cuenta que llevas en la app (por ejemplo, tu bróker), no es
            una inversión sino un traspaso: dejará de contar como inversión en el inicio y en los
            informes.
          </DialogDescription>
        </DialogHeader>

        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Necesitas otra cuenta a la que traspasarlo. Crea primero la cuenta de destino.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <p className="rounded-xl bg-muted px-3.5 py-3 text-sm">
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground"> · </span>
              <Amount cents={Math.abs(amountCents)} className="font-medium" />
              <span className="text-muted-foreground"> desde {fromAccountName ?? 'la cuenta'}</span>
            </p>

            <Field>
              <Label htmlFor={`convert-to-${transactionId}`}>Cuenta de destino</Label>
              <NativeSelect
                id={`convert-to-${transactionId}`}
                aria-invalid={!!errors.toAccountId}
                {...register('toAccountId')}
              >
                {targets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldHint>Se crea la entrada en esa cuenta con la misma fecha e importe.</FieldHint>
              <FieldError>{errors.toAccountId?.message}</FieldError>
            </Field>

            {selected?.type === 'investment' && (
              <p className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-3.5 py-3 text-[0.8125rem] leading-relaxed">
                <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                <span>
                  El importe se suma al efectivo de {selected.name}. Si las compras que hiciste con
                  este dinero aparecen como «sin efectivo», el efectivo saldrá de más: bórralas y
                  vuelve a registrarlas con «Pagada con el efectivo de la cuenta» marcado.
                </span>
              </p>
            )}

            <FormError>{serverError}</FormError>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Convirtiendo…' : 'Convertir'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
