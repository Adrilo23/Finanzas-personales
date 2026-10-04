'use server'

import { createClient } from '@/lib/supabase/server'
import { transactionSchema, transferSchema } from '@/lib/validation/transaction-schemas'
import { buildTransferRows } from '@/lib/transfers'
import { applyCategorySign, eurosToCents } from '@/lib/money'
import { revalidatePath } from 'next/cache'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/**
 * Valida el formulario y devuelve las columnas a guardar. Común a crear y editar.
 * El signo nunca lo decide el usuario: se deriva del tipo de la categoría elegida.
 * Las FK no pasan por RLS, así que se comprueba aquí que cuenta y categoría son
 * del usuario (la RLS filtra estos select a lo propio).
 */
async function parseTransaction(supabase: SupabaseServer, formData: FormData) {
  const parsed = transactionSchema.safeParse({
    accountId: formData.get('accountId'),
    categoryId: formData.get('categoryId'),
    amount: Number(formData.get('amount')),
    description: formData.get('description') || '',
    transactionDate: formData.get('transactionDate'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message } as const
  }

  const [{ data: category }, { data: account }] = await Promise.all([
    supabase.from('categories').select('type').eq('id', parsed.data.categoryId).maybeSingle(),
    supabase.from('accounts').select('id').eq('id', parsed.data.accountId).maybeSingle(),
  ])

  if (!category) {
    return { error: 'Categoría no válida' } as const
  }
  if (!account) {
    return { error: 'Cuenta no válida' } as const
  }

  return {
    values: {
      account_id: parsed.data.accountId,
      category_id: parsed.data.categoryId,
      amount_cents: applyCategorySign(eurosToCents(parsed.data.amount), category.type),
      description: parsed.data.description || null,
      transaction_date: parsed.data.transactionDate,
    },
  } as const
}

function revalidateMoneyViews() {
  revalidatePath('/transactions')
  revalidatePath('/accounts')
  revalidatePath('/budgets')
  revalidatePath('/reports')
  revalidatePath('/')
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const result = await parseTransaction(supabase, formData)
  if ('error' in result) {
    return { error: result.error }
  }

  const { error } = await supabase.from('transactions').insert({
    ...result.values,
    user_id: user.id,
    currency: 'EUR',
  })

  if (error) {
    return { error: error.message }
  }

  revalidateMoneyViews()
  return { success: true }
}

/** Edición directa (decisión del roadmap); updated_at lo actualiza un trigger. */
export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()

  const result = await parseTransaction(supabase, formData)
  if ('error' in result) {
    return { error: result.error }
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(result.values)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!data) {
    return { error: 'El movimiento no existe o se ha eliminado' }
  }

  revalidateMoneyViews()
  return { success: true }
}

function parseTransfer(formData: FormData) {
  return transferSchema.safeParse({
    fromAccountId: formData.get('fromAccountId'),
    toAccountId: formData.get('toAccountId'),
    amount: Number(formData.get('amount')),
    description: formData.get('description') || '',
    transactionDate: formData.get('transactionDate'),
  })
}

/** Traspaso entre cuentas propias: dos movimientos enlazados, insertados en una sola sentencia. */
export async function createTransfer(formData: FormData) {
  const parsed = parseTransfer(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // Las FK no pasan por RLS: ambas cuentas deben ser del usuario.
  const { count } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .in('id', [parsed.data.fromAccountId, parsed.data.toAccountId])
  if (count !== 2) {
    return { error: 'Cuenta no válida' }
  }

  const { error } = await supabase.from('transactions').insert(
    buildTransferRows({
      userId: user.id,
      transferId: crypto.randomUUID(),
      fromAccountId: parsed.data.fromAccountId,
      toAccountId: parsed.data.toAccountId,
      amountCents: eurosToCents(parsed.data.amount),
      date: parsed.data.transactionDate,
      description: parsed.data.description,
    })
  )
  if (error) {
    return { error: error.message }
  }

  revalidateMoneyViews()
  return { success: true }
}

/** Edita las dos patas a la vez (función update_transfer, atómica y con RLS). */
export async function updateTransfer(transferId: string, formData: FormData) {
  const parsed = parseTransfer(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('update_transfer', {
    p_transfer_id: transferId,
    p_from_account: parsed.data.fromAccountId,
    p_to_account: parsed.data.toAccountId,
    p_amount_cents: eurosToCents(parsed.data.amount),
    p_date: parsed.data.transactionDate,
    p_description: parsed.data.description || '',
  })
  if (error) {
    return { error: error.message }
  }

  revalidateMoneyViews()
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  // Si es una pata de un traspaso, se borran las dos.
  const { data: row } = await supabase
    .from('transactions')
    .select('transfer_id')
    .eq('id', id)
    .maybeSingle()

  // Soft delete: mantenemos la fila para no perder trazabilidad de saldos históricos.
  const deletion = supabase.from('transactions').update({ deleted_at: new Date().toISOString() })
  const { error } = row?.transfer_id
    ? await deletion.eq('transfer_id', row.transfer_id)
    : await deletion.eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidateMoneyViews()
  return { success: true }
}
