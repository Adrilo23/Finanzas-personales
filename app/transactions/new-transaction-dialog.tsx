'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownIcon, PlusIcon } from 'lucide-react'
import {
  transactionSchema,
  transferSchema,
  type TransactionInput,
  type TransferInput,
} from '@/lib/validation/transaction-schemas'
import { centsToEuros, parseEurosInput } from '@/lib/money'
import { createTransaction, createTransfer, updateTransaction, updateTransfer } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { AmountInput } from '@/components/ui/amount-input'
import { Segmented } from '@/components/ui/segmented'
import { Field, FieldError, FormError } from '@/components/ui/field'
import { CATEGORY_TYPE_META, isCategoryType, type CategoryType } from '@/components/category-type'
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
type Kind = CategoryType | 'transfer'

const MOVEMENT_OPTIONS = (['expense', 'income', 'investment'] as const).map((value) => ({
  value: value as Kind,
  label: CATEGORY_TYPE_META[value].label,
}))
const ALL_OPTIONS = [...MOVEMENT_OPTIONS, { value: 'transfer' as Kind, label: 'Traspaso' }]

function todayISO() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Datos de un movimiento existente para editarlo. `amountCents` con signo, tal cual en BD. */
export type EditableTransaction = {
  id: string
  accountId: string
  categoryId: string | null
  categoryType: string | null
  amountCents: number
  description: string | null
  transactionDate: string
}

/** Datos de un traspaso existente para editarlo. */
export type EditableTransfer = {
  transferId: string
  fromAccountId: string
  toAccountId: string
  amountCents: number
  description: string | null
  transactionDate: string
}

/**
 * Diálogo de alta de movimientos y traspasos. Con `transaction` edita un movimiento;
 * con `transfer`, un traspaso (el tipo no se puede cambiar al editar un traspaso).
 */
export function NewTransactionDialog({
  accounts,
  categories,
  size = 'default',
  transaction,
  transfer,
  trigger,
}: {
  accounts: AccountOption[]
  categories: CategoryOption[]
  size?: 'default' | 'sm'
  transaction?: EditableTransaction
  transfer?: EditableTransfer
  trigger?: React.ReactNode
}) {
  const editing = Boolean(transaction || transfer)
  const initialKind: Kind = transfer
    ? 'transfer'
    : transaction && isCategoryType(transaction.categoryType)
      ? transaction.categoryType
      : 'expense'

  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<Kind>(initialKind)
  // Cambia en cada apertura para que el formulario parta siempre de los datos guardados.
  const [formKey, setFormKey] = useState(0)

  const disabled = accounts.length === 0
  const close = () => setOpen(false)

  // Al editar un movimiento se puede cambiar entre gasto/ingreso/inversión, pero no
  // convertirlo en traspaso; al editar un traspaso no se muestra el selector.
  const options = transaction ? MOVEMENT_OPTIONS : transfer ? null : ALL_OPTIONS
  const selector = options && (
    <Segmented
      name="kind"
      aria-label="Tipo de movimiento"
      value={kind}
      onValueChange={setKind}
      options={options}
    />
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setKind(initialKind)
          setFormKey((k) => k + 1)
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size={size}
            disabled={disabled}
            title={disabled ? 'Crea antes una cuenta' : undefined}
          >
            <PlusIcon data-icon="inline-start" />
            Nuevo movimiento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === 'transfer'
              ? editing
                ? 'Editar traspaso'
                : 'Nuevo traspaso'
              : editing
                ? 'Editar movimiento'
                : 'Nuevo movimiento'}
          </DialogTitle>
          <DialogDescription>
            {kind === 'transfer'
              ? 'Mueve dinero entre tus cuentas. No cuenta como ingreso ni como gasto.'
              : 'Escribe el importe en positivo: el signo lo pone el tipo.'}
          </DialogDescription>
        </DialogHeader>

        {kind === 'transfer' ? (
          <TransferForm
            key={`t${formKey}`}
            accounts={accounts}
            transfer={transfer}
            selector={selector}
            onDone={close}
          />
        ) : (
          <MovementForm
            key={`m${formKey}`}
            kind={kind}
            accounts={accounts}
            categories={categories}
            transaction={transaction}
            selector={selector}
            onDone={close}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormFooter({ submitting, label }: { submitting: boolean; label: string }) {
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

function MovementForm({
  kind,
  accounts,
  categories,
  transaction,
  selector,
  onDone,
}: {
  kind: CategoryType
  accounts: AccountOption[]
  categories: CategoryOption[]
  transaction?: EditableTransaction
  selector: React.ReactNode
  onDone: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const visibleCategories = categories.filter((c) => c.type === kind)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          accountId: transaction.accountId,
          categoryId:
            transaction.categoryType === kind && transaction.categoryId
              ? transaction.categoryId
              : (visibleCategories[0]?.id ?? ''),
          amount: centsToEuros(Math.abs(transaction.amountCents)),
          description: transaction.description ?? '',
          transactionDate: transaction.transactionDate,
        }
      : {
          accountId: accounts[0]?.id ?? '',
          categoryId: visibleCategories[0]?.id ?? '',
          description: '',
          transactionDate: todayISO(),
        },
  })

  const onSubmit = async (data: TransactionInput) => {
    setServerError(null)
    // Al cambiar de tipo, la lista de categorías cambia y el navegador muestra la primera,
    // pero el formulario puede conservar la del tipo anterior: se usa la que se ve.
    const categoryId = visibleCategories.some((c) => c.id === data.categoryId)
      ? data.categoryId
      : (visibleCategories[0]?.id ?? '')
    const formData = new FormData()
    formData.set('accountId', data.accountId)
    formData.set('categoryId', categoryId)
    formData.set('amount', String(data.amount))
    formData.set('description', data.description ?? '')
    formData.set('transactionDate', data.transactionDate)

    const result = transaction
      ? await updateTransaction(transaction.id, formData)
      : await createTransaction(formData)
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
          autoFocus={!transaction}
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
      </div>

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field>
          <Label htmlFor="transactionDate">Fecha</Label>
          <Input id="transactionDate" type="date" {...register('transactionDate')} />
          <FieldError>{errors.transactionDate?.message}</FieldError>
        </Field>

        <Field>
          <Label htmlFor="description">
            Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input id="description" placeholder="Ej. Compra semanal" {...register('description')} />
        </Field>
      </div>

      <FormError>{serverError}</FormError>
      <FormFooter
        submitting={isSubmitting}
        label={transaction ? 'Guardar cambios' : 'Guardar movimiento'}
      />
    </form>
  )
}

function TransferForm({
  accounts,
  transfer,
  selector,
  onDone,
}: {
  accounts: AccountOption[]
  transfer?: EditableTransfer
  selector: React.ReactNode
  onDone: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: transfer
      ? {
          fromAccountId: transfer.fromAccountId,
          toAccountId: transfer.toAccountId,
          amount: centsToEuros(Math.abs(transfer.amountCents)),
          description: transfer.description ?? '',
          transactionDate: transfer.transactionDate,
        }
      : {
          fromAccountId: accounts[0]?.id ?? '',
          toAccountId: accounts[1]?.id ?? '',
          description: '',
          transactionDate: todayISO(),
        },
  })

  const onSubmit = async (data: TransferInput) => {
    setServerError(null)
    const formData = new FormData()
    formData.set('fromAccountId', data.fromAccountId)
    formData.set('toAccountId', data.toAccountId)
    formData.set('amount', String(data.amount))
    formData.set('description', data.description ?? '')
    formData.set('transactionDate', data.transactionDate)

    const result = transfer
      ? await updateTransfer(transfer.transferId, formData)
      : await createTransfer(formData)
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
          Necesitas al menos dos cuentas para hacer un traspaso.
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
          autoFocus={!transfer}
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

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field>
          <Label htmlFor="transfer-date">Fecha</Label>
          <Input id="transfer-date" type="date" {...register('transactionDate')} />
          <FieldError>{errors.transactionDate?.message}</FieldError>
        </Field>
        <Field>
          <Label htmlFor="transfer-description">
            Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="transfer-description"
            placeholder="Ej. Aportación mensual"
            {...register('description')}
          />
        </Field>
      </div>

      <FormError>{serverError}</FormError>
      <FormFooter
        submitting={isSubmitting}
        label={transfer ? 'Guardar cambios' : 'Guardar traspaso'}
      />
    </form>
  )
}
