'use server'

import { createClient } from '@/lib/supabase/server'
import { recurringSchema, recurringTransferSchema } from '@/lib/validation/recurring-schemas'
import { eurosToCents } from '@/lib/money'
import { validateAllocations, type Allocation } from '@/lib/allocations'
import { revalidatePath } from 'next/cache'

/** Día de referencia: los vencimientos mensuales/anuales vuelven siempre a este día. */
const anchorDayOf = (date: string) => Number(date.slice(8, 10))

type Supabase = Awaited<ReturnType<typeof createClient>>

/** Valida una regla de movimiento (gasto, ingreso o inversión) y comprueba que cuenta y categoría son del usuario. */
async function parseMovementRule(supabase: Supabase, formData: FormData) {
  const parsed = recurringSchema.safeParse({
    accountId: formData.get('accountId'),
    categoryId: formData.get('categoryId'),
    amount: Number(formData.get('amount')),
    frequency: formData.get('frequency'),
    nextRunDate: formData.get('nextRunDate'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message } as const
  }

  // Las FK no pasan por RLS: cuenta y categoría deben ser del usuario.
  const [{ data: account }, { data: category }] = await Promise.all([
    supabase.from('accounts').select('id').eq('id', parsed.data.accountId).maybeSingle(),
    supabase.from('categories').select('id').eq('id', parsed.data.categoryId).maybeSingle(),
  ])
  if (!account || !category) {
    return { error: 'Cuenta o categoría no válida' } as const
  }

  return {
    row: {
      account_id: parsed.data.accountId,
      category_id: parsed.data.categoryId,
      amount_cents: eurosToCents(parsed.data.amount),
      frequency: parsed.data.frequency,
      next_run_date: parsed.data.nextRunDate,
      anchor_day: anchorDayOf(parsed.data.nextRunDate),
    },
  } as const
}

/**
 * Valida un traspaso periódico entre cuentas propias y su reparto opcional en activos
 * (plan de aportación). El reparto llega como JSON con importes en euros.
 */
async function parseTransferRule(supabase: Supabase, formData: FormData) {
  const parsed = recurringTransferSchema.safeParse({
    fromAccountId: formData.get('fromAccountId'),
    toAccountId: formData.get('toAccountId'),
    amount: Number(formData.get('amount')),
    frequency: formData.get('frequency'),
    nextRunDate: formData.get('nextRunDate'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message } as const
  }

  const { data: ruleAccounts } = await supabase
    .from('accounts')
    .select('id, type')
    .in('id', [parsed.data.fromAccountId, parsed.data.toAccountId])
  if (ruleAccounts?.length !== 2) {
    return { error: 'Cuenta no válida' } as const
  }

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
    return { error: 'Reparto no válido' } as const
  }
  const allocationError = validateAllocations(totalCents, allocations)
  if (allocationError) {
    return { error: allocationError } as const
  }
  if (allocations.length > 0) {
    const destination = ruleAccounts.find((a) => a.id === parsed.data.toAccountId)
    if (destination?.type !== 'investment') {
      return {
        error: 'Para repartir en activos, el destino debe ser una cuenta de inversión',
      } as const
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
      return { error: 'Activo no válido en el reparto' } as const
    }
  }

  return {
    row: {
      account_id: parsed.data.fromAccountId,
      to_account_id: parsed.data.toAccountId,
      category_id: null,
      amount_cents: totalCents,
      frequency: parsed.data.frequency,
      next_run_date: parsed.data.nextRunDate,
      anchor_day: anchorDayOf(parsed.data.nextRunDate),
    },
    allocations,
  } as const
}

export async function createRecurringRule(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  if (formData.get('kind') === 'transfer') {
    return createRecurringTransfer(supabase, user.id, formData)
  }

  const result = await parseMovementRule(supabase, formData)
  if ('error' in result) {
    return { error: result.error }
  }

  const { error } = await supabase
    .from('recurring_rules')
    .insert({ ...result.row, user_id: user.id, active: true })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/recurring')
  return { success: true }
}

/** Traspaso periódico entre cuentas propias (con o sin reparto en activos). */
async function createRecurringTransfer(supabase: Supabase, userId: string, formData: FormData) {
  const result = await parseTransferRule(supabase, formData)
  if ('error' in result) {
    return { error: result.error }
  }

  const { data: rule, error } = await supabase
    .from('recurring_rules')
    .insert({ ...result.row, user_id: userId, active: true })
    .select('id')
    .single()

  if (error || !rule) {
    return { error: error?.message ?? 'No se ha podido crear la regla' }
  }

  if (result.allocations.length > 0) {
    const { error: allocationsError } = await supabase.from('recurring_allocations').insert(
      result.allocations.map((a) => ({
        user_id: userId,
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

/**
 * Edita una regla. Solo cambia los próximos vencimientos: lo ya generado se queda igual.
 * Una regla de movimiento no se convierte en traspaso ni al revés.
 */
export async function updateRecurringRule(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  if (formData.get('kind') === 'transfer') {
    const result = await parseTransferRule(supabase, formData)
    if ('error' in result) {
      return { error: result.error }
    }
    // Regla y reparto se sustituyen juntos (atómico) en la RPC.
    const { error } = await supabase.rpc('update_recurring_transfer', {
      p_rule_id: id,
      p_from_account: result.row.account_id,
      p_to_account: result.row.to_account_id,
      p_amount_cents: result.row.amount_cents,
      p_frequency: result.row.frequency,
      p_next_run_date: result.row.next_run_date,
      p_allocations: result.allocations.map((a) => ({
        holding_id: a.holdingId,
        amount_cents: a.amountCents,
      })),
    })
    if (error) {
      return { error: error.message }
    }
  } else {
    const result = await parseMovementRule(supabase, formData)
    if ('error' in result) {
      return { error: result.error }
    }
    const { data, error } = await supabase
      .from('recurring_rules')
      .update(result.row)
      .eq('id', id)
      .is('to_account_id', null)
      .select('id')
    if (error) {
      return { error: error.message }
    }
    if (!data?.length) {
      return { error: 'La regla no existe' }
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
