import type { createClient } from '@/lib/supabase/server'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/**
 * Límite de frecuencia por usuario (auditoría B5): `max` veces por ventana `window` (un
 * intervalo de Postgres, p. ej. '10 minutes') para cada `action`. Va en la BD
 * (`check_rate_limit`, migración 0017) porque no hay Redis ni estado entre peticiones.
 *
 * Si la función falla (BD caída, migración aún sin aplicar) se deja pasar: es una
 * protección contra abusos, no una barrera de seguridad, y no debe tumbar la app.
 */
export async function allowAction(
  supabase: SupabaseServer,
  action: string,
  max: number,
  window: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_action: action,
    p_max: max,
    p_window: window,
  })
  if (error) {
    console.error('check_rate_limit', error.code, error.message)
    return true
  }
  return data !== false
}

export const TOO_MANY_REQUESTS = 'Demasiadas peticiones seguidas. Espera unos minutos y vuelve a probar.'
