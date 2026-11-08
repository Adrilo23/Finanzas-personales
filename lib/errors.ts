/**
 * Mensajes de error para el usuario a partir de un error de Supabase/PostgREST.
 * Los textos de Postgres (nombres de tablas, constraints…) no deben llegar al cliente
 * (auditoría B4): se traducen por código y el detalle se registra en el servidor.
 */

type DbError = { code?: string | null; message?: string | null }

export const GENERIC_ERROR = 'No se ha podido completar la operación. Inténtalo de nuevo.'

export function userError(error: DbError, fallback: string = GENERIC_ERROR): string {
  const code = error.code ?? ''

  // P0001: `raise exception` de nuestras funciones SQL, escritos para el usuario
  // («Plan no encontrado»…). Son los únicos mensajes de la BD que se muestran tal cual.
  if (code === 'P0001' && error.message) return error.message

  console.error('[db]', code || 'sin-código', error.message ?? '')

  switch (code) {
    case '23505':
      return 'Ya existe un registro igual.'
    case '23503':
      return 'No se puede hacer porque hay datos relacionados, o lo relacionado ya no existe.'
    case '23514':
    case '22003':
      return 'Algún valor no es válido.'
    case '42501':
      return 'No tienes permiso para hacer esto.'
    default:
      return fallback
  }
}
