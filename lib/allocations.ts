/**
 * Reparto de un traspaso recurrente entre activos (plan de aportación).
 * Lógica pura, sin base de datos, para poder testearla.
 */

export type Allocation = { holdingId: string; amountCents: number }

/**
 * Comprueba un reparto: importes positivos, sin activos repetidos y sin repartir más
 * de lo que se traspasa (lo que sobre se queda como efectivo en la cuenta destino).
 * Devuelve el mensaje de error o null si es válido.
 */
export function validateAllocations(totalCents: number, allocations: Allocation[]): string | null {
  if (allocations.some((a) => !a.holdingId)) return 'Elige un activo en cada línea del reparto'
  if (allocations.some((a) => !Number.isInteger(a.amountCents) || a.amountCents <= 0)) {
    return 'Cada línea del reparto necesita un importe mayor que 0'
  }
  const ids = new Set(allocations.map((a) => a.holdingId))
  if (ids.size !== allocations.length) return 'Hay un activo repetido en el reparto'
  const sum = allocations.reduce((total, a) => total + a.amountCents, 0)
  if (sum > totalCents) return 'El reparto suma más que el importe del traspaso'
  return null
}

/** Lo que queda sin repartir (se queda como efectivo en la cuenta destino). */
export function unallocatedCents(totalCents: number, allocations: Allocation[]): number {
  return totalCents - allocations.reduce((total, a) => total + a.amountCents, 0)
}
