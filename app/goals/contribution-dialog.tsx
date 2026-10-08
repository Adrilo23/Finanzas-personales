'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { PlusIcon } from 'lucide-react'
import { contributionSchema, type ContributionInput } from '@/lib/validation/goal-schemas'
import { parseEurosInput } from '@/lib/money'
import { addContribution } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AmountInput } from '@/components/ui/amount-input'
import { Segmented } from '@/components/ui/segmented'
import { Field, FieldError, FormError } from '@/components/ui/field'
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

/** Registrar una aportación o una retirada en un objetivo. */
export function ContributionDialog({ goalId, name }: { goalId: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const defaults = (): Partial<ContributionInput> => ({
    goalId,
    kind: 'deposit',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: '',
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContributionInput>({
    resolver: zodResolver(contributionSchema),
    defaultValues: defaults(),
  })
  const kind = useWatch({ control, name: 'kind' })

  const onSubmit = async (data: ContributionInput) => {
    setServerError(null)
    const formData = new FormData()
    formData.set('goalId', data.goalId)
    formData.set('kind', data.kind)
    formData.set('amount', String(data.amount))
    formData.set('date', data.date)
    formData.set('note', data.note ?? '')

    const result = await addContribution(formData)
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
        <Button variant="outline" size="sm">
          <PlusIcon data-icon="inline-start" />
          Aportar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            Es solo el seguimiento del objetivo: no mueve dinero entre tus cuentas ni cuenta como
            gasto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <input type="hidden" {...register('goalId')} />
          <Segmented
            name="kind"
            aria-label="Tipo"
            value={kind}
            onValueChange={(v) => setValue('kind', v)}
            options={[
              { value: 'deposit', label: 'Aportación' },
              { value: 'withdraw', label: 'Retirada' },
            ]}
          />

          <Field>
            <Label htmlFor="contribution-amount">Importe</Label>
            <AmountInput
              id="contribution-amount"
              autoFocus
              aria-invalid={!!errors.amount}
              {...register('amount', { setValueAs: parseEurosInput })}
            />
            <FieldError>{errors.amount?.message}</FieldError>
          </Field>

          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Field>
              <Label htmlFor="contribution-date">Fecha</Label>
              <Input id="contribution-date" type="date" {...register('date')} />
              <FieldError>{errors.date?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="contribution-note">Nota (opcional)</Label>
              <Input id="contribution-note" {...register('note')} />
              <FieldError>{errors.note?.message}</FieldError>
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
              {isSubmitting ? 'Guardando…' : kind === 'deposit' ? 'Añadir aportación' : 'Retirar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
