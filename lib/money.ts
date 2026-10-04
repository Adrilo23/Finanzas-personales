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

/**
 * Convierte lo que escribe el usuario a euros, en formato español o con punto decimal:
 * "12,50", "12.5", "1.234,56", "1234.56", "1.500" (= 1500), "12,50 €".
 * Vacío o inválido → 0 (la validación zod lo rechaza después por no ser positivo).
 */
export function parseEurosInput(value: unknown): number {
  if (typeof value === 'number') return value
  let text = String(value ?? '')
    .replace(/[\s €]/g, '')
    .trim()
  if (text === '') return 0

  const hasComma = text.includes(',')
  const hasDot = text.includes('.')
  if (hasComma && hasDot) {
    // El separador que aparece el último es el decimal; el otro, de miles.
    const decimal = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.'
    const thousands = decimal === ',' ? '.' : ','
    text = text.split(thousands).join('').replace(decimal, '.')
  } else if (hasComma) {
    text = text.replace(',', '.')
  } else if (hasDot && /^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    // "1.500" o "12.345.678": puntos como separador de miles (formato español).
    text = text.split('.').join('')
  }

  if (!/^-?\d+(\.\d+)?$/.test(text)) return 0
  return Number(text)
}

/**
 * Regla de signo del proyecto: el usuario siempre introduce importes positivos y el
 * signo sale del tipo de categoría. income → positivo; expense, investment o sin
 * categoría → negativo.
 */
export function applyCategorySign(cents: number, categoryType: string | null | undefined): number {
  const abs = Math.abs(cents)
  return categoryType === 'income' ? abs : -abs
}
