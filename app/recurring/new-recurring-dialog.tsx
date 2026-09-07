'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  recurringSchema,
  type RecurringInput,
  FREQUENCY_LABELS,
} from '@/lib/validation/recurring-schemas'
import { createRecurringRule } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type AccountOption = { id: string; name: string }
type CategoryOption = { id: string; name: string; type: string }

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  investment: 'Inversión',
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
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      accountId: accounts[0]?.id ?? '',
      categoryId: categories[0]?.id ?? '',
      amount: 0,
      frequency: 'monthly',
      nextRunDate: today,
    },
  })

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
    reset()
    setOpen(false)
  }

  const disabled = accounts.length === 0 || categories.length === 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} title={disabled ? 'Crea antes una cuenta y una categoría' : ''}>
          Nueva regla recurrente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva regla recurrente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="accountId">Cuenta</Label>
            <select
              id="accountId"
              {...register('accountId')}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="categoryId">Categoría</Label>
            <select
              id="categoryId"
              {...register('categoryId')}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {CATEGORY_TYPE_LABELS[c.type]} · {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="amount">Importe (€)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              {...register('amount', {
                setValueAs: (v) => {
                  if (typeof v === 'number') return v
                  const normalized = String(v).replace(',', '.').trim()
                  const num = parseFloat(normalized)
                  return Number.isNaN(num) ? 0 : num
                },
              })}
            />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            <p className="text-xs text-muted-foreground">
              Escribe siempre el importe en positivo — el signo lo pone la categoría elegida.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="frequency">Frecuencia</Label>
            <select
              id="frequency"
              {...register('frequency')}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="nextRunDate">Primera fecha</Label>
            <Input id="nextRunDate" name="nextRunDate" type="date" {...register('nextRunDate')} />
            {errors.nextRunDate && (
              <p className="text-sm text-red-500">{errors.nextRunDate.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-500">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
