'use server'

import { createClient } from '@/lib/supabase/server'
import { recurringSchema, recurringTransferSchema } from '@/lib/validation/recurring-schemas'
import { eurosToCents } from '@/lib/money'
import { revalidatePath } from 'next/cache'

/** Día de referencia: los vencimientos mensuales/anuales vuelven siempre a este día. */
const anchorDayOf = (date: string) => Number(date.slice(8, 10))

export async function createRecurringRule(formData: FormData) {
  if (formData.get('kind') === 'transfer') return createRecurringTransfer(formData)

  const parsed = recurringSchema.safeParse({
    accountId: formData.get('accountId'),
    categoryId: formData.get('categoryId'),
    amount: Number(formData.get('amount')),
    frequency: formData.get('frequency'),
    nextRunDate: formData.get('nextRunDate'),
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

  // Las FK no pasan por RLS: cuenta y categoría deben ser del usuario.
  const [{ data: account }, { data: category }] = await Promise.all([
    supabase.from('accounts').select('id').eq('id', parsed.data.accountId).maybeSingle(),
    supabase.from('categories').select('id').eq('id', parsed.data.categoryId).maybeSingle(),
  ])
  if (!account || !category) {
    return { error: 'Cuenta o categoría no válida' }
  }

  const { error } = await supabase.from('recurring_rules').insert({
    user_id: user.id,
    account_id: parsed.data.accountId,
    category_id: parsed.data.categoryId,
    amount_cents: eurosToCents(parsed.data.amount),
    frequency: parsed.data.frequency,
    next_run_date: parsed.data.nextRunDate,
    anchor_day: anchorDayOf(parsed.data.nextRunDate),
    active: true,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/recurring')
  return { success: true }
}

/** Traspaso periódico entre cuentas propias (p. ej. aportación mensual BBVA → My Investor). */
async function createRecurringTransfer(formData: FormData) {
  const parsed = recurringTransferSchema.safeParse({
    fromAccountId: formData.get('fromAccountId'),
    toAccountId: formData.get('toAccountId'),
    amount: Number(formData.get('amount')),
    frequency: formData.get('frequency'),
    nextRunDate: formData.get('nextRunDate'),
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

  const { count } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .in('id', [parsed.data.fromAccountId, parsed.data.toAccountId])
  if (count !== 2) {
    return { error: 'Cuenta no válida' }
  }

  const { error } = await supabase.from('recurring_rules').insert({
    user_id: user.id,
    account_id: parsed.data.fromAccountId,
    to_account_id: parsed.data.toAccountId,
    category_id: null,
    amount_cents: eurosToCents(parsed.data.amount),
    frequency: parsed.data.frequency,
    next_run_date: parsed.data.nextRunDate,
    anchor_day: anchorDayOf(parsed.data.nextRunDate),
    active: true,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/recurring')
  return { success: true }
}

export async function toggleRecurringRule(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('recurring_rules').update({ active }).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/recurring')
  return { success: true }
}

export async function deleteRecurringRule(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('recurring_rules').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/recurring')
  return { success: true }
}
