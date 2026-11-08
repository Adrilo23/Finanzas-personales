'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Máximo de rutas por llamada a Storage `remove`. */
const REMOVE_BATCH = 100

/**
 * Borra la cuenta del usuario y todos sus datos (derecho de supresión). Primero los
 * archivos de Storage, que no cascadean; después la RPC `delete_my_account`, que borra
 * al usuario y, con él, el resto de filas. Si falla la RPC, los archivos ya no están,
 * pero la cuenta sigue y el usuario puede reintentarlo.
 */
export async function deleteMyAccount(): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión no válida. Vuelve a iniciar sesión.' }

  const { data: attachments, error: listError } = await supabase
    .from('attachments')
    .select('storage_path')
  if (listError) return { error: 'No se han podido leer tus adjuntos. Inténtalo de nuevo.' }

  const paths = (attachments ?? []).map((a) => a.storage_path)
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const { error } = await supabase.storage.from('attachments').remove(paths.slice(i, i + REMOVE_BATCH))
    if (error) return { error: 'No se han podido borrar tus adjuntos. Inténtalo de nuevo.' }
  }

  const { error } = await supabase.rpc('delete_my_account')
  if (error) return { error: 'No se ha podido borrar la cuenta. Inténtalo de nuevo.' }

  await supabase.auth.signOut()
  redirect('/')
}
