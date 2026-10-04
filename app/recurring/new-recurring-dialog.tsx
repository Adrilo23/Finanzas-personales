'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownIcon, PlusIcon, XIcon } from 'lucide-react'
import {
  recurringSchema,
  recurringTransferSchema,
  type RecurringInput,
  type RecurringTransferInput,
  FREQUENCY_LABELS,
} from '@/lib/validation/recurring-schemas'
import { eurosToCents, formatCents, parseEurosInput } from '@/lib/money'
import { unallocatedCents, validateAllocations } from '@/lib/allocations'
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

type AccountOption = { id: string; name: string; type?: string | null }
export type HoldingOption = { id: string; name: string; accountId: string; accountName: string }
type CategoryOption = { id: string; name: string; type: string }
type Kind = CategoryType | 'transfer'

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  ...(['expense', 'income', 'investment'] as const).map((value) => ({
    value: value as Kind,
    label: CATEGORY_TYPE_META[value].label,
  })),
  { value: 'transfer', label: 'Traspaso' },
]

function todayISO() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function NewRecurringDialog({
  accounts,
  categories,
  holdings = [],
}: {
  accounts: AccountOption[]
  categories: CategoryOption[]
  holdings?: HoldingOption[]
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<Kind>('expense')
  const [formKey, setFormKey] = useState(0)

  const disabled = accounts.length === 0
  const close = () => setOpen(false)
  const selector = (
    <Segmented
      name="kind"
      aria-label="Tipo de regla"
      value={kind}
      onValueChange={setKind}
      options={KIND_OPTIONS}
    />
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setKind('expense')
          setFormKey((k) => k + 1)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled} title={disabled ? 'Crea antes una cuenta' : undefined}>
          <PlusIcon data-icon="inline-start" />
          Nueva regla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === 'transfer' ? 'Nuevo traspaso recurrente' : 'Nueva regla recurrente'}
          </DialogTitle>
          <DialogDescription>
            {kind === 'transfer'
              ? 'Se moverá el dinero entre tus cuentas en cada vencimiento, sin contar como gasto.'
              : 'Se añadirá un movimiento en cada vencimiento, empezando por la primera fecha.'}
          </DialogDescription>
        </DialogHeader>
        {kind === 'transfer' ? (
          <TransferRuleForm
            key={`t${formKey}`}
            accounts={accounts}
            holdings={holdings}
            selector={selector}
            onDone={close}
          />
        ) : (
          <MovementRuleForm
            key={`m${formKey}`}
            kind={kind}
            accounts={accounts}
            categories={categories}
            selector={selector}
            onDone={close}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function FrequencyAndDate({
  register,
  dateError,
}: {
  // register de cualquiera de los dos formularios (comparten estos campos).
  register: (name: 'frequency' | 'nextRunDate') => object
  dateError?: string
}) {
  return (
    <>
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
        <FieldError>{dateError}</FieldError>
      </Field>
    </>
  )
}

function Footer({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button type="button" variant="outline">
          Cancelar
        </Button>
      </DialogClose>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Guardando…' : label}
      </Button>
    </DialogFooter>
  )
}

function MovementRuleForm({
  kind,
  accounts,
  categories,
  selector,
  onDone,
}: {
  kind: CategoryType
  accounts: AccountOption[]
  categories: CategoryOption[]
  selector: React.ReactNode
  onDone: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const visibleCategories = categories.filter((c) => c.type === kind)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      accountId: accounts[0]?.id ?? '',
      categoryId: visibleCategories[0]?.id ?? '',
      frequency: 'monthly',
      nextRunDate: todayISO(),
    },
  })

  const onSubmit = async (data: RecurringInput) => {
    setServerError(null)
    // Al cambiar de tipo se usa la categoría visible (ver new-transaction-dialog).
    const categoryId = visibleCategories.some((c) => c.id === data.categoryId)
      ? data.categoryId
      : (visibleCategories[0]?.id ?? '')
    const formData = new FormData()
    formData.set('kind', 'movement')
    formData.set('accountId', data.accountId)
    formData.set('categoryId', categoryId)
    formData.set('amount', String(data.amount))
    formData.set('frequency', data.frequency)
    formData.set('nextRunDate', data.nextRunDate)

    const result = await createRecurringRule(formData)
    if (result?.error) {
      setServerError(result.error)
      return
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      {selector}

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
        </Field>

        <FrequencyAndDate register={register} dateError={errors.nextRunDate?.message} />
      </div>

      <FormError>{serverError}</FormError>
      <Footer submitting={isSubmitting} label="Crear regla" />
    </form>
  )
}

type AllocationLine = { key: number; holdingId: string; amount: string }

function TransferRuleForm({
  accounts,
  holdings,
  selector,
  onDone,
}: {
  accounts: AccountOption[]
  holdings: HoldingOption[]
  selector: React.ReactNode
  onDone: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [lines, setLines] = useState<AllocationLine[]>([])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RecurringTransferInput>({
    resolver: zodResolver(recurringTransferSchema),
    defaultValues: {
      fromAccountId: accounts[0]?.id ?? '',
      toAccountId: accounts[1]?.id ?? '',
      frequency: 'monthly',
      nextRunDate: todayISO(),
    },
  })

  const toAccountId = useWatch({ control, name: 'toAccountId' })
  const amount = useWatch({ control, name: 'amount' })
  const destination = accounts.find((a) => a.id === toAccountId)
  const canAllocate = destination?.type === 'investment' && holdings.length > 0
  const activeLines = canAllocate ? lines : []
  const totalCents = eurosToCents(parseEurosInput(amount ?? 0))
  const allocations = activeLines.map((l) => ({
    holdingId: l.holdingId,
    amountCents: eurosToCents(parseEurosInput(l.amount)),
  }))
  const leftover = unallocatedCents(totalCents, allocations)

  const updateLine = (key: number, patch: Partial<AllocationLine>) =>
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const removeLine = (key: number) => setLines((current) => current.filter((l) => l.key !== key))

  const onSubmit = async (data: RecurringTransferInput) => {
    setServerError(null)
    const allocationError = validateAllocations(eurosToCents(data.amount), allocations)
    if (allocationError) {
      setServerError(allocationError)
      return
    }
    const formData = new FormData()
    formData.set('kind', 'transfer')
    formData.set(
      'allocations',
      JSON.stringify(
        activeLines.map((l) => ({ holdingId: l.holdingId, amount: parseEurosInput(l.amount) }))
      )
    )
    formData.set('fromAccountId', data.fromAccountId)
    formData.set('toAccountId', data.toAccountId)
    formData.set('amount', String(data.amount))
    formData.set('frequency', data.frequency)
    formData.set('nextRunDate', data.nextRunDate)

    const result = await createRecurringRule(formData)
    if (result?.error) {
      setServerError(result.error)
      return
    }
    onDone()
  }

  if (accounts.length < 2) {
    return (
      <div className="grid gap-4">
        {selector}
        <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
          Necesitas al menos dos cuentas para programar un traspaso.
        </p>
      </div>
    )
  }

  const accountOptions = accounts.map((a) => (
    <option key={a.id} value={a.id}>
      {a.name}
    </option>
  ))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      {selector}

      <Field>
        <Label htmlFor="transfer-amount" className="sr-only">
          Importe
        </Label>
        <AmountInput
          id="transfer-amount"
          autoFocus
          aria-invalid={!!errors.amount}
          {...register('amount', { setValueAs: parseEurosInput })}
        />
        <FieldError>{errors.amount?.message}</FieldError>
      </Field>

      <div className="grid gap-1.5">
        <Field>
          <Label htmlFor="fromAccountId">Desde</Label>
          <NativeSelect id="fromAccountId" {...register('fromAccountId')}>
            {accountOptions}
          </NativeSelect>
        </Field>
        <ArrowDownIcon aria-hidden className="mx-auto mt-1 size-4 text-muted-foreground" />
        <Field>
          <Label htmlFor="toAccountId">Hacia</Label>
          <NativeSelect
            id="toAccountId"
            aria-invalid={!!errors.toAccountId}
            {...register('toAccountId')}
          >
            {accountOptions}
          </NativeSelect>
          <FieldError>{errors.toAccountId?.message}</FieldError>
        </Field>
      </div>

      {canAllocate && (
        <fieldset className="grid gap-2.5 rounded-xl bg-muted/50 p-3">
          <legend className="sr-only">Repartir en activos</legend>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">
              Repartir en activos{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </p>
            {activeLines.length > 0 && (
              <p
                className={
                  leftover < 0 ? 'num text-xs text-negative' : 'num text-xs text-muted-foreground'
                }
              >
                {leftover < 0
                  ? `Te pasas ${formatCents(-leftover)}`
                  : leftover > 0
                    ? `${formatCents(leftover)} quedan en efectivo`
                    : 'Repartido entero'}
              </p>
            )}
          </div>
          {activeLines.map((line) => {
            const holding = holdings.find((h) => h.id === line.holdingId)
            const viaOther = holding && holding.accountId !== toAccountId
            return (
              <div key={line.key} className="grid gap-1">
                <div className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2">
                  <NativeSelect
                    aria-label="Activo"
                    value={line.holdingId}
                    onChange={(e) => updateLine(line.key, { holdingId: e.target.value })}
                  >
                    <option value="">Elige un activo…</option>
                    {[...new Set(holdings.map((h) => h.accountName))].map((accountName) => (
                      <optgroup key={accountName} label={accountName}>
                        {holdings
                          .filter((h) => h.accountName === accountName)
                          .map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </NativeSelect>
                  <Input
                    aria-label="Importe"
                    inputMode="decimal"
                    placeholder="0,00 €"
                    className="num text-right"
                    value={line.amount}
                    onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Quitar línea"
                    className="text-muted-foreground"
                    onClick={() => removeLine(line.key)}
                  >
                    <XIcon />
                  </Button>
                </div>
                {viaOther && (
                  <p className="text-xs text-muted-foreground">
                    Pasará de {destination?.name} a {holding.accountName}.
                  </p>
                )}
              </div>
            )
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() =>
              setLines((current) => [
                ...current,
                // Clave única y estable: siguiente número tras la mayor existente.
                { key: Math.max(0, ...current.map((l) => l.key)) + 1, holdingId: '', amount: '' },
              ])
            }
          >
            <PlusIcon data-icon="inline-start" />
            Añadir activo al reparto
          </Button>
          <p className="text-xs text-muted-foreground">
            Cada vencimiento creará una compra pendiente por activo, con las participaciones
            estimadas. Las confirmas cuando el bróker ejecute la orden.
          </p>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FrequencyAndDate register={register} dateError={errors.nextRunDate?.message} />
      </div>

      <FormError>{serverError}</FormError>
      <Footer
        submitting={isSubmitting}
        label={activeLines.length > 0 ? 'Crear plan de aportación' : 'Crear traspaso'}
      />
    </form>
  )
}
