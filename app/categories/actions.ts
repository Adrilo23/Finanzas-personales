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

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/categories')
  return { success: true }
}
