import { z } from 'zod'

/**
 * Tope por importe: mil millones de euros. Muy por encima de cualquier uso real, pero
 * acota errores de tecleo y mantiene los céntimos lejos del límite de enteros exactos
 * de JavaScript (2^53).
 */
export const MAX_AMOUNT_EUROS = 1_000_000_000

/** Como mucho dos decimales (céntimos). Tolera el ruido de coma flotante de p. ej. 0,1 + 0,2. */
export function hasAtMostTwoDecimals(euros: number): boolean {
  const cents = euros * 100
  return Math.abs(cents - Math.round(cents)) < 1e-6
}

/**
 * Importe introducido por el usuario, en euros: finito, mayor que 0, con céntimos
 * exactos y bajo el tope. Así nunca se guarda un movimiento de 0 céntimos por
 * redondear algo como 0,004 €.
 */
export const positiveAmount = z
  .number({ error: 'Escribe un importe' })
  .finite('Importe no válido')
  .positive('El importe debe ser mayor que 0')
  .max(MAX_AMOUNT_EUROS, 'El importe es demasiado grande')
  .refine(hasAtMostTwoDecimals, 'Como mucho dos decimales')

/** Igual, pero admite 0 (p. ej. el saldo inicial de una cuenta). */
export const nonNegativeAmount = z
  .number({ error: 'Escribe un importe' })
  .finite('Importe no válido')
  .min(0, 'No puede ser negativo')
  .max(MAX_AMOUNT_EUROS, 'El importe es demasiado grande')
  .refine(hasAtMostTwoDecimals, 'Como mucho dos decimales')
