/** Filas por página: el máximo que devuelve PostgREST (`max_rows` en supabase/config.toml). */
export const PAGE_SIZE = 1000

/**
 * PostgREST corta cada respuesta en `max_rows` filas sin avisar. Para totales que pueden
 * superar ese número (un año de movimientos, todo el histórico), pide páginas con
 * `.range(from, to)` hasta que una llegue incompleta. La consulta debe tener un orden
 * estable (p. ej. `.order('id')`) para que las páginas no se solapen.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}
