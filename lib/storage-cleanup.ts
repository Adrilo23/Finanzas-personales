import type { createClient } from '@/lib/supabase/server'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

const BUCKET = 'attachments'
/** Máximo de rutas por llamada a Storage `remove`. */
const REMOVE_BATCH = 100
/** Entradas por página de `list`. */
const LIST_PAGE = 1000

/**
 * Borra archivos del bucket de adjuntos en lotes. Devuelve `false` si algún lote falla
 * (el resto se sigue intentando).
 */
export async function removeAttachmentFiles(supabase: SupabaseServer, paths: string[]): Promise<boolean> {
  let ok = true
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + REMOVE_BATCH))
    if (error) {
      console.error('storage remove', error.message)
      ok = false
    }
  }
  return ok
}

/**
 * Todos los archivos que hay en la carpeta del usuario (`{user_id}/{movimiento}/archivo`),
 * esté o no en la tabla `attachments`: así se encuentran también los huérfanos (subidas
 * cuyo registro falló, o adjuntos cuya fila se borró en cascada). `list` devuelve un nivel
 * por llamada y, sin `id`, las entradas son carpetas.
 */
export async function listUserAttachmentFiles(
  supabase: SupabaseServer,
  userId: string
): Promise<{ paths: string[]; error: boolean }> {
  const bucket = supabase.storage.from(BUCKET)

  async function listAll(prefix: string) {
    const entries: { name: string; id: string | null }[] = []
    for (let offset = 0; ; offset += LIST_PAGE) {
      const { data, error } = await bucket.list(prefix, { limit: LIST_PAGE, offset })
      if (error) throw error
      entries.push(...(data ?? []))
      if (!data || data.length < LIST_PAGE) return entries
    }
  }

  try {
    const paths: string[] = []
    for (const folder of await listAll(userId)) {
      if (folder.id) {
        // Un archivo suelto en la raíz del usuario.
        paths.push(`${userId}/${folder.name}`)
        continue
      }
      for (const file of await listAll(`${userId}/${folder.name}`)) {
        if (file.id) paths.push(`${userId}/${folder.name}/${file.name}`)
      }
    }
    return { paths, error: false }
  } catch (error) {
    console.error('storage list', error instanceof Error ? error.message : error)
    return { paths: [], error: true }
  }
}
