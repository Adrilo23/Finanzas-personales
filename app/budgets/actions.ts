'use server'

import { createClient } from '@/lib/supabase/server'
import { budgetSchema } from '@/lib/validation/budget-schemas'
import { eurosToCents } from '@/lib/money'
import { revalidatePath } from 'next/cache'

/** Crea el presupuesto de una categoría o, si ya tiene uno, actualiza su importe. */
export async function upsertBudget(formData: FormData) {
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get('categoryId'),
    amount: Number(formData.get('amount')),
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

  // La FK no pasa por RLS: comprobamos aquí que la categoría es del usuario
  // (la RLS de categories filtra el select) y que es de gasto.
  const { data: category } = await supabase
    .from('categories')
    .select('type')
    .eq('id', parsed.data.categoryId)
    .maybeSingle()

  if (!category || category.type !== 'expense') {
    return { error: 'Elige una categoría de gasto' }
  }

  const { error } = await supabase.from('budgets').upsert(
    {
      user_id: user.id,
      category_id: parsed.data.categoryId,
      amount_cents: eurosToCents(parsed.data.amount),
    },
    { onConflict: 'user_id,category_id' }
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/budgets')
  revalidatePath('/')
  return { success: true }
}

export async function deleteBudget(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('budgets').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/budgets')
  revalidatePath('/')
  return { success: true }
}
