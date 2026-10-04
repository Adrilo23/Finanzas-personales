'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import { budgetSchema, type BudgetInput } from '@/lib/validation/budget-schemas'
import { centsToEuros, formatCents, parseEurosInput } from '@/lib/money'
import { upsertBudget } from './actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { AmountInput } from '@/components/ui/amount-input'
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

export type ExpenseCategoryOption = { id: string; name: string; parent_id: string | null }

/**
 * Crear o editar un presupuesto. Si se pasa `initial`, el diálogo edita ese presupuesto
 * (la categoría queda fija); si no, crea uno nuevo.
 */
export function BudgetDialog({
  categories,
  budgetsByCategory,
  initial,
  trigger,
}: {
  categories: ExpenseCategoryOption[]
  /** Importe actual (céntimos) de las categorías que ya tienen presupuesto. */
  budgetsByCategory: Record<string, number>
  initial?: { categoryId: string; amountCents: number; name: string }
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Padres seguidos de sus subcategorías.
  const parents = categories.filter((c) => c.parent_id === null)
  const ordered = [
    ...parents.flatMap((p) => [p, ...categories.filter((c) => c.parent_id === p.id)]),
    ...categories.filter((c) => c.parent_id !== null && !parents.some((p) => p.id === c.parent_id)),
  ]
  const firstFree = ordered.find((c) => budgetsByCategory[c.id] === undefined) ?? ordered[0]

  const defaults = (): Partial<BudgetInput> => ({
    categoryId: initial?.categoryId ?? firstFree?.id ?? '',
    amount: initial ? centsToEuros(initial.amountCents) : undefined,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BudgetInput>({ resolver: zodResolver(budgetSchema), defaultValues: defaults() })

  const categoryId = useWatch({ control, name: 'categoryId' })
  const existing = !initial ? budgetsByCategory[categoryId] : undefined
  const hasChildren = categories.some((c) => c.parent_id === categoryId)

  const onSubmit = async (data: BudgetInput) => {
    setServerError(null)
    const formData = new FormData()
    formData.set('categoryId', data.categoryId)
    formData.set('amount', String(data.amount))

    const result = await upsertBudget(formData)
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
          <Button
            disabled={categories.length === 0}
            title={categories.length === 0 ? 'Crea antes una categoría de gasto' : undefined}
          >
            <PlusIcon data-icon="inline-start" />
            Nuevo presupuesto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? `Presupuesto de ${initial.name}` : 'Nuevo presupuesto'}
          </DialogTitle>
          <DialogDescription>Un límite mensual de gasto. Se reinicia cada mes.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          {initial ? (
            <input type="hidden" {...register('categoryId')} />
          ) : (
            <Field>
              <Label htmlFor="categoryId">Categoría</Label>
              <NativeSelect
                id="categoryId"
                aria-invalid={!!errors.categoryId}
                {...register('categoryId')}
              >
                {ordered.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? ` ${c.name}` : c.name}
                  </option>
                ))}
              </NativeSelect>
              {existing !== undefined ? (
                <FieldHint className="text-warning">
                  Ya tiene un presupuesto de {formatCents(existing)}; se sustituirá.
                </FieldHint>
              ) : hasChildren ? (
                <FieldHint>Incluye lo gastado en sus subcategorías.</FieldHint>
              ) : null}
              <FieldError>{errors.categoryId?.message}</FieldError>
            </Field>
          )}

          <Field>
            <Label htmlFor="amount">Límite mensual</Label>
            <AmountInput
              id="amount"
              autoFocus
              aria-invalid={!!errors.amount}
              {...register('amount', { setValueAs: parseEurosInput })}
            />
            <FieldError>{errors.amount?.message}</FieldError>
          </Field>

          <FormError>{serverError}</FormError>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear presupuesto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
