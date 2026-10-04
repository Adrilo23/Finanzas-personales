'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import {
  recurringSchema,
  type RecurringInput,
  FREQUENCY_LABELS,
} from '@/lib/validation/recurring-schemas'
import { parseEurosInput } from '@/lib/money'
import { createRecurringRule } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { AmountInput } from '@/components/ui/amount-input'
import { Segmented } from '@/components/ui/segmented'
import { Field, FieldError, FormError } from '@/components/ui/field'
import { CATEGORY_TYPE_META, type CategoryType } from '@/components/category-type'
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

type AccountOption = { id: string; name: string }
type CategoryOption = { id: string; name: string; type: string }

const TYPE_OPTIONS = (['expense', 'income', 'investment'] as const).map((value) => ({
  value,
  label: CATEGORY_TYPE_META[value].label,
}))

function todayISO() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function NewRecurringDialog({
  accounts,
  categories,
}: {
  accounts: AccountOption[]
  categories: CategoryOption[]
}) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [kind, setKind] = useState<CategoryType>('expense')

  const categoriesOf = (type: CategoryType) => categories.filter((c) => c.type === type)
  const visibleCategories = categoriesOf(kind)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      accountId: accounts[0]?.id ?? '',
      categoryId: categoriesOf('expense')[0]?.id ?? '',
      frequency: 'monthly',
      nextRunDate: todayISO(),
    },
  })

  const changeKind = (next: CategoryType) => {
    setKind(next)
    setValue('categoryId', categoriesOf(next)[0]?.id ?? '')
  }

  const onSubmit = async (data: RecurringInput) => {
    setServerError(null)
    const formData = new FormData()
    formData.set('accountId', data.accountId)
    formData.set('categoryId', data.categoryId)
    formData.set('amount', String(data.amount))
    formData.set('frequency', data.frequency)
    formData.set('nextRunDate', data.nextRunDate)

    const result = await createRecurringRule(formData)
    if (result?.error) {
      setServerError(result.error)
      return
    }
    reset({
      accountId: data.accountId,
      categoryId: categoriesOf(kind)[0]?.id ?? '',
      frequency: 'monthly',
      nextRunDate: todayISO(),
    })
    setOpen(false)
  }

  const disabled = accounts.length === 0 || categories.length === 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setServerError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button
          disabled={disabled}
          title={disabled ? 'Crea antes una cuenta y una categoría' : undefined}
        >
          <PlusIcon data-icon="inline-start" />
          Nueva regla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva regla recurrente</DialogTitle>
          <DialogDescription>
            Se añadirá un movimiento en cada vencimiento, empezando por la primera fecha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <Segmented
            name="kind"
            aria-label="Tipo de movimiento"
            value={kind}
            onValueChange={changeKind}
            options={TYPE_OPTIONS}
          />

          <Field>
            <Label htmlFor="amount" className="sr-only">
              Importe
            </Label>
            <AmountInput
              id="amount"
              autoFocus
              aria-invalid={!!errors.amount}
              {...register('amount', { setValueAs: parseEurosInput })}
            />
            <FieldError>{errors.amount?.message}</FieldError>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="categoryId">Categoría</Label>
              <NativeSelect
                id="categoryId"
                aria-invalid={!!errors.categoryId}
                {...register('categoryId')}
              >
                {visibleCategories.length === 0 && (
                  <option value="">No hay categorías de este tipo</option>
                )}
                {visibleCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldError>{errors.categoryId?.message}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="accountId">Cuenta</Label>
              <NativeSelect id="accountId" {...register('accountId')}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldError>{errors.accountId?.message}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="frequency">Frecuencia</Label>
              <NativeSelect id="frequency" {...register('frequency')}>
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <Label htmlFor="nextRunDate">Primera fecha</Label>
              <Input id="nextRunDate" type="date" {...register('nextRunDate')} />
              <FieldError>{errors.nextRunDate?.message}</FieldError>
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
              {isSubmitting ? 'Guardando…' : 'Crear regla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
