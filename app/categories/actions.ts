'use server'

import { createClient } from '@/lib/supabase/server'
import { categorySchema } from '@/lib/validation/category-schemas'
import { revalidatePath } from 'next/cache'

export async function createCategory(formData: FormData) {
  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    parentId: formData.get('parentId') || '',
    icon: formData.get('icon') || '',
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

  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    parent_id: parsed.data.parentId || null,
    icon: parsed.data.icon || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/categories')
  return { success: true }
}

/**
 * Edita nombre, icono y categoría padre. El tipo no se puede cambiar: el signo de los
 * movimientos ya registrados se calculó a partir de él y dejaría de cuadrar.
 */
export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: current } = await supabase
    .from('categories')
    .select('id, type')
    .eq('id', id)
    .maybeSingle()

  if (!current) {
    return { error: 'La categoría no existe' }
  }

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    type: current.type,
    parentId: formData.get('parentId') || '',
    icon: formData.get('icon') || '',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const parentId = parsed.data.parentId || null

  if (parentId) {
    // Un solo nivel de subcategorías: el padre debe ser principal, del mismo tipo,
    // y la categoría editada no puede tener hijas.
    if (parentId === id) {
      return { error: 'Una categoría no puede estar dentro de sí misma' }
    }
    const [{ data: parent }, { count: childCount }] = await Promise.all([
      supabase.from('categories').select('type, parent_id').eq('id', parentId).maybeSingle(),
      supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', id),
    ])
    if (!parent || parent.type !== current.type || parent.parent_id !== null) {
      return { error: 'Categoría padre no válida' }
    }
    if ((childCount ?? 0) > 0) {
      return { error: 'Esta categoría tiene subcategorías; no puede ir dentro de otra' }
    }
  }

  const { error } = await supabase
    .from('categories')
    .update({
      name: parsed.data.name,
      parent_id: parentId,
      icon: parsed.data.icon || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/categories')
  revalidatePath('/transactions')
  revalidatePath('/budgets')
  revalidatePath('/')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/categories')
  return { success: true }
}
