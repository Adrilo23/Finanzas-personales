'use server'

import { createClient } from '@/lib/supabase/server'
import { accountSchema } from '@/lib/validation/account-schemas'
import { eurosToCents } from '@/lib/money'
import { revalidatePath } from 'next/cache'

export async function createAccount(formData: FormData) {
  const parsed = accountSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    currency: formData.get('currency') || 'EUR',
    initialBalance: Number(formData.get('initialBalance')),
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

  const { error } = await supabase.from('accounts').insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    currency: parsed.data.currency,
    initial_balance_cents: eurosToCents(parsed.data.initialBalance),
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/accounts')
  return { success: true }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/accounts')
  return { success: true }
}
