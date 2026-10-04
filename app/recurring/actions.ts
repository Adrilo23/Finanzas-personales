'use server'

import { createClient } from '@/lib/supabase/server'
import { recurringSchema, recurringTransferSchema } from '@/lib/validation/recurring-schemas'
import { eurosToCents } from '@/lib/money'
import { validateAllocations, type Allocation } from '@/lib/allocations'
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

  const { data: ruleAccounts } = await supabase
    .from('accounts')
    .select('id, type')
    .in('id', [parsed.data.fromAccountId, parsed.data.toAccountId])
  if (ruleAccounts?.length !== 2) {
    return { error: 'Cuenta no válida' }
  }

  // Reparto opcional en activos (plan de aportación). Llega como JSON con importes en euros.
  const totalCents = eurosToCents(parsed.data.amount)
  let allocations: Allocation[] = []
  try {
    const raw = JSON.parse(String(formData.get('allocations') || '[]')) as {
      holdingId: string
      amount: number
    }[]
    allocations = raw.map((a) => ({
      holdingId: String(a.holdingId ?? ''),
      amountCents: eurosToCents(Number(a.amount)),
    }))
  } catch {
    return { error: 'Reparto no válido' }
  }
  const allocationError = validateAllocations(totalCents, allocations)
  if (allocationError) {
    return { error: allocationError }
  }
  if (allocations.length > 0) {
    const destination = ruleAccounts.find((a) => a.id === parsed.data.toAccountId)
    if (destination?.type !== 'investment') {
      return { error: 'Para repartir en activos, el destino debe ser una cuenta de inversión' }
    }
    // Las FK no pasan por RLS: los activos deben ser del usuario.
    const { count } = await supabase
      .from('holdings')
      .select('id', { count: 'exact', head: true })
      .in(
        'id',
        allocations.map((a) => a.holdingId)
      )
    if (count !== allocations.length) {
      return { error: 'Activo no válido en el reparto' }
    }
  }

  const { data: rule, error } = await supabase
    .from('recurring_rules')
    .insert({
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
    .select('id')
    .single()

  if (error || !rule) {
    return { error: error?.message ?? 'No se ha podido crear la regla' }
  }

  if (allocations.length > 0) {
    const { error: allocationsError } = await supabase.from('recurring_allocations').insert(
      allocations.map((a) => ({
        user_id: user.id,
        rule_id: rule.id,
        holding_id: a.holdingId,
        amount_cents: a.amountCents,
      }))
    )
    if (allocationsError) {
      // Sin reparto la regla no es lo que el usuario pidió: se deshace.
      await supabase.from('recurring_rules').delete().eq('id', rule.id)
      return { error: allocationsError.message }
    }
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
