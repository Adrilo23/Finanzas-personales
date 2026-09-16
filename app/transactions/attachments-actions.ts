'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAttachment(
  transactionId: string,
  storagePath: string,
  fileName: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const { error } = await supabase.from('attachments').insert({
    user_id: user.id,
    transaction_id: transactionId,
    storage_path: storagePath,
    file_name: fileName,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/transactions')
  return { success: true }
}

export async function deleteAttachment(id: string, storagePath: string) {
  const supabase = await createClient()

  // Borramos primero el archivo físico; si falla, no dejamos un registro huérfano en la BD.
  const { error: storageError } = await supabase.storage.from('attachments').remove([storagePath])
  if (storageError) {
    return { error: storageError.message }
  }

  const { error } = await supabase.from('attachments').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/transactions')
  return { success: true }
}
