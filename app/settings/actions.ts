'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listUserAttachmentFiles, removeAttachmentFiles } from '@/lib/storage-cleanup'

/**
 * Borra la cuenta del usuario y todos sus datos (derecho de supresión). Pide la
 * contraseña: una sesión abierta o robada no basta para borrarlo todo. Después elimina
 * los archivos de Storage —todo lo que haya en su carpeta, no solo lo que figura en la
 * tabla `attachments`, para no dejar huérfanos— y llama a la RPC `delete_my_account`,
 * que borra al usuario y, con él, el resto de filas. Si falla la RPC, los archivos ya no
 * están, pero la cuenta sigue y el usuario puede reintentarlo.
 */
export async function deleteMyAccount(password: string): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: 'Sesión no válida. Vuelve a iniciar sesión.' }

  if (typeof password !== 'string' || password.length === 0) {
    return { error: 'Escribe tu contraseña para confirmar.' }
  }
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (authError) {
    return {
      error:
        authError.status === 429
          ? 'Demasiados intentos. Espera unos minutos y vuelve a probar.'
          : 'La contraseña no es correcta.',
    }
  }

  const { paths, error: listError } = await listUserAttachmentFiles(supabase, user.id)
  if (listError) return { error: 'No se han podido leer tus adjuntos. Inténtalo de nuevo.' }
  if (!(await removeAttachmentFiles(supabase, paths))) {
    return { error: 'No se han podido borrar tus adjuntos. Inténtalo de nuevo.' }
  }

  const { error } = await supabase.rpc('delete_my_account')
  if (error) return { error: 'No se ha podido borrar la cuenta. Inténtalo de nuevo.' }

  await supabase.auth.signOut()
  redirect('/')
}
