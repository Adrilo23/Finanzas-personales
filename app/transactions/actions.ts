'use server'

import { createClient } from '@/lib/supabase/server'
import { transactionSchema } from '@/lib/validation/transaction-schemas'
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

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  // Soft delete: mantenemos la fila para no perder trazabilidad de saldos históricos.
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidateMoneyViews()
  return { success: true }
}
