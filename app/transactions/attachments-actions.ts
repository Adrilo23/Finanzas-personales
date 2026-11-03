'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  attachmentPath,
  isOwnAttachmentPath,
  validateAttachmentFile,
} from '@/lib/attachments'

/*
 * Adjuntos (tickets y facturas). Todo pasa por el servidor: el navegador no tiene
 * acceso a la sesión de Supabase (la cookie es HttpOnly). Para subir, el servidor
 * comprueba el movimiento y entrega una URL de subida firmada para una ruta concreta.
 */

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

async function currentUser(supabase: SupabaseServer) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/** El movimiento existe, no está borrado y es del usuario (la RLS filtra lo ajeno). */
async function ownsTransaction(supabase: SupabaseServer, transactionId: string) {
  const { data } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .is('deleted_at', null)
    .maybeSingle()
  return Boolean(data)
}

export async function listAttachments(transactionId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('attachments')
    .select('id, file_name')
    .eq('transaction_id', transactionId)
    .order('uploaded_at', { ascending: false })
  return data ?? []
}

/** Valida el archivo y devuelve una URL firmada para subirlo a una ruta del usuario. */
export async function prepareAttachmentUpload(
  transactionId: string,
  file: { name: string; type: string; size: number }
) {
  const invalid = validateAttachmentFile(file)
  if (invalid) return { error: invalid }

  const supabase = await createClient()
  const user = await currentUser(supabase)
  if (!user) return { error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' }
  if (!(await ownsTransaction(supabase, transactionId))) return { error: 'Movimiento no válido' }

  const path = attachmentPath(user.id, transactionId, crypto.randomUUID(), file.name)
  const { data, error } = await supabase.storage.from('attachments').createSignedUploadUrl(path)
  if (error || !data) return { error: 'No se ha podido preparar la subida' }

  return { path: data.path, signedUrl: data.signedUrl }
}

/** Registra un adjunto ya subido. La ruta tiene que ser del usuario y de ese movimiento. */
export async function createAttachment(transactionId: string, storagePath: string, fileName: string) {
  const supabase = await createClient()
  const user = await currentUser(supabase)
  if (!user) return { error: 'No autenticado' }

  if (!isOwnAttachmentPath(storagePath, user.id, transactionId)) {
    return { error: 'Ruta de adjunto no válida' }
  }
  if (!(await ownsTransaction(supabase, transactionId))) return { error: 'Movimiento no válido' }

  const { error } = await supabase.from('attachments').insert({
    user_id: user.id,
    transaction_id: transactionId,
    storage_path: storagePath,
    file_name: fileName.slice(0, 200),
  })
  if (error) return { error: error.message }

  revalidatePath('/transactions')
  return { success: true }
}

/** Enlace temporal (60 s) para ver un adjunto propio. */
export async function getAttachmentUrl(id: string) {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('attachments')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()
  if (!row) return { error: 'No se ha encontrado el adjunto' }

  const { data } = await supabase.storage.from('attachments').createSignedUrl(row.storage_path, 60)
  if (!data?.signedUrl) return { error: 'No se ha podido abrir el adjunto' }
  return { url: data.signedUrl }
}

export async function deleteAttachment(id: string) {
  const supabase = await createClient()

  // La ruta sale de la fila (propia, por RLS), no de lo que mande el cliente.
  const { data: row } = await supabase
    .from('attachments')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()
  if (!row) return { error: 'No se ha encontrado: puede que ya estuviera borrado' }

  // Borramos primero el archivo físico; si falla, no dejamos un registro huérfano en la BD.
  const { error: storageError } = await supabase.storage
    .from('attachments')
    .remove([row.storage_path])
  if (storageError) return { error: storageError.message }

  const { error } = await supabase.from('attachments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/transactions')
  return { success: true }
}
