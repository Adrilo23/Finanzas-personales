'use server'

import { createClient } from '@/lib/supabase/server'
import { transactionSchema } from '@/lib/validation/transaction-schemas'
import { eurosToCents } from '@/lib/money'
import { revalidatePath } from 'next/cache'

export async function createTransaction(formData: FormData) {
  const parsed = transactionSchema.safeParse({
    accountId: formData.get('accountId'),
    categoryId: formData.get('categoryId'),
    amount: Number(formData.get('amount')),
    description: formData.get('description') || '',
    transactionDate: formData.get('transactionDate'),
  })

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

  // El signo nunca lo decide el usuario: se deriva del tipo de la categoría elegida.
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('type')
    .eq('id', parsed.data.categoryId)
    .single()

  if (categoryError || !category) {
    return { error: 'Categoría no válida' }
  }

  const cents = eurosToCents(parsed.data.amount)
  const signedCents = category.type === 'income' ? cents : -cents

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: parsed.data.accountId,
    category_id: parsed.data.categoryId,
    amount_cents: signedCents,
    currency: 'EUR',
    description: parsed.data.description || null,
    transaction_date: parsed.data.transactionDate,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/transactions')
  revalidatePath('/accounts')
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

  revalidatePath('/transactions')
  revalidatePath('/accounts')
  return { success: true }
}
