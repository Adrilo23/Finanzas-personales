'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { eurosToCents } from '@/lib/money'
import { contributionSchema, goalSchema } from '@/lib/validation/goal-schemas'

function revalidateGoals() {
  revalidatePath('/goals')
  revalidatePath('/')
}

/** Crea un objetivo o, si se pasa `id`, edita el existente. */
export async function saveGoal(formData: FormData) {
  const parsed = goalSchema.safeParse({
    name: formData.get('name'),
    icon: formData.get('icon') || undefined,
    target: Number(formData.get('target')),
    targetDate: formData.get('targetDate') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const values = {
    name: parsed.data.name,
    icon: parsed.data.icon || null,
    target_cents: eurosToCents(parsed.data.target),
    target_date: parsed.data.targetDate || null,
  }
  const id = formData.get('id')

  const { error } =
    typeof id === 'string' && id
      ? await supabase.from('savings_goals').update(values).eq('id', id)
      : await supabase.from('savings_goals').insert({ ...values, user_id: user.id })

  if (error) return { error: error.message }
  revalidateGoals()
  return { success: true }
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('savings_goals').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateGoals()
  return { success: true }
}

/** Registra una aportación o una retirada. No toca cuentas ni movimientos. */
export async function addContribution(formData: FormData) {
  const parsed = contributionSchema.safeParse({
    goalId: formData.get('goalId'),
    kind: formData.get('kind'),
    amount: Number(formData.get('amount')),
    date: formData.get('date'),
    note: formData.get('note') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const cents = eurosToCents(parsed.data.amount)

  if (parsed.data.kind === 'withdraw') {
    // No se puede retirar más de lo ahorrado.
    const { data: rows } = await supabase
      .from('goal_contributions')
      .select('amount_cents')
      .eq('goal_id', parsed.data.goalId)
    const saved = (rows ?? []).reduce((sum, r) => sum + r.amount_cents, 0)
    if (cents > saved) return { error: 'No puedes retirar más de lo que has ahorrado' }
  }

  const { error } = await supabase.from('goal_contributions').insert({
    user_id: user.id,
    goal_id: parsed.data.goalId,
    amount_cents: parsed.data.kind === 'withdraw' ? -cents : cents,
    contribution_date: parsed.data.date,
    note: parsed.data.note || null,
  })
  if (error) return { error: error.message }

  revalidateGoals()
  return { success: true }
}

export async function deleteContribution(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('goal_contributions').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateGoals()
  return { success: true }
}
