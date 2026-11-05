'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Guarda en la cuenta que la app se ha usado instalada (PWA), para que el paso
 * «Instálala en tu móvil» quede hecho en todos los dispositivos. Va en
 * `user_metadata`: es un dato del propio usuario, sin valor de seguridad.
 */
export async function markAppInstalled() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (user.user_metadata?.pwa_installed === true) return { success: true }

  const { error } = await supabase.auth.updateUser({ data: { pwa_installed: true } })
  if (error) return { error: 'No se ha podido guardar' }
  revalidatePath('/')
  return { success: true }
}
