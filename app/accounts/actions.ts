'use server'

import { createClient } from '@/lib/supabase/server'
import { accountSchema } from '@/lib/validation/account-schemas'
import { eurosToCents } from '@/lib/money'
import { firstOfNextMonth } from '@/lib/interest'
import { format } from 'date-fns'
import { revalidatePath } from 'next/cache'

const today = () => format(new Date(), 'yyyy-MM-dd')

export async function createAccount(formData: FormData) {
  const parsed = accountSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    currency: formData.get('currency') || 'EUR',
    initialBalance: Number(formData.get('initialBalance')),
    interestRate: formData.get('interestRate') ? Number(formData.get('interestRate')) : undefined,
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
    // El primer abono de intereses es el día 1 del mes que viene.
    interest_rate: parsed.data.interestRate ?? null,
    interest_next_date: parsed.data.interestRate ? firstOfNextMonth(today()) : null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/accounts')
  return { success: true }
}

export async function updateAccount(id: string, formData: FormData) {
  const parsed = accountSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    currency: formData.get('currency') || 'EUR',
    initialBalance: Number(formData.get('initialBalance')),
    interestRate: formData.get('interestRate') ? Number(formData.get('interestRate')) : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: current } = await supabase
    .from('accounts')
    .select('interest_next_date')
    .eq('id', id)
    .maybeSingle()
  const rate = parsed.data.interestRate ?? null
  // Al activar el interés, el primer abono es el día 1 del mes que viene; si ya estaba
  // activo, se mantiene la fecha (cambiar el % no repite ni salta ningún mes).
  const nextDate = rate ? (current?.interest_next_date ?? firstOfNextMonth(today())) : null

  // La moneda no se edita: los movimientos ya registrados están en la moneda original.
  const { data, error } = await supabase
    .from('accounts')
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      initial_balance_cents: eurosToCents(parsed.data.initialBalance),
      interest_rate: rate,
      interest_next_date: nextDate,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!data) {
    return { error: 'La cuenta no existe' }
  }

  revalidatePath('/accounts')
  revalidatePath('/')
  return { success: true }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  // Desde la migración 0004 sus movimientos (y adjuntos) se borran en cascada.
  const { error } = await supabase.from('accounts').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/accounts')
  revalidatePath('/')
  return { success: true }
}
