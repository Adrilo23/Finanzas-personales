import type { User } from '@supabase/supabase-js'
import type { createClient } from '@/lib/supabase/server'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/**
 * Mensaje de las actions cuando no hay sesión. La cola sin conexión (lib/offline-queue.ts,
 * `NOT_AUTHENTICATED`) lo reconoce para esperar en vez de descartar el movimiento: si lo
 * cambias, cámbialo allí también.
 */
export const NO_SESSION_ERROR = 'No autenticado'

/**
 * Usuario de la sesión o `null`. Toda Server Action debe llamarlo (o `getUser`) al
 * empezar: son endpoints POST que se pueden invocar desde cualquier ruta, también las
 * públicas, y la RLS por sí sola devolvería «0 filas» en vez de un error claro.
 */
export async function requireUser(supabase: SupabaseServer): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
