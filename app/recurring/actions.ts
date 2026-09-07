'use server'

import { createClient } from '@/lib/supabase/server'
import { recurringSchema } from '@/lib/validation/recurring-schemas'
import { eurosToCents } from '@/lib/money'
import { revalidatePath } from 'next/cache'

export async function createRecurringRule(formData: FormData) {
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

  const { error } = await supabase.from('recurring_rules').insert({
    user_id: user.id,
    account_id: parsed.data.accountId,
    category_id: parsed.data.categoryId,
    amount_cents: eurosToCents(parsed.data.amount),
    frequency: parsed.data.frequency,
    next_run_date: parsed.data.nextRunDate,
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
