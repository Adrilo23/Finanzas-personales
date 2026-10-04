/**
 * Único lugar del proyecto donde se hace aritmética de conversión euros/céntimos.
 * Nadie más debería sumar/restar importes usando float directamente.
 */

export function eurosToCents(euros: number): number {
  // Redondeamos tras un único *100 para evitar arrastre de errores de coma flotante.
  return Math.round(euros * 100)
}

export function centsToEuros(cents: number): number {
  return cents / 100
}

export function formatCents(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(cents / 100)
}

/** Convierte lo que escribe el usuario ("12,50", "12.5") a euros. Vacío o inválido → 0. */
export function parseEurosInput(value: unknown): number {
  if (typeof value === 'number') return value
  const num = parseFloat(String(value ?? '').replace(',', '.').trim())
  return Number.isNaN(num) ? 0 : num
}
