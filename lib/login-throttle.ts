import { createHash } from 'node:crypto'

/**
 * Limitador de intentos de login (auditoría F-08). Supabase Auth solo ve la IP de
 * Vercel, porque el login pasa por una Server Action, así que su límite por IP no
 * distingue a un atacante de un usuario normal. La app cuenta los fallos en la tabla
 * login_attempts (migración 0014) con dos claves:
 *  - pair: IP + email → frena adivinar la contraseña de una cuenta (5 fallos / 15 min).
 *  - ip: solo la IP → frena probar muchas cuentas desde un mismo sitio (30 / 15 min).
 * Se guardan hashes, no la IP ni el email en claro.
 */

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/** IP del cliente tras el proxy de Vercel. */
export function clientIp(headers: { get(name: string): string | null }): string {
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || 'desconocida'
}

export function throttleKeys(ip: string, email: string): string[] {
  const normalizedEmail = email.trim().toLowerCase()
  return [`pair:${sha256(`${ip}|${normalizedEmail}`)}`, `ip:${sha256(ip)}`]
}

/** «Demasiados intentos…» con los minutos que quedan (redondeando hacia arriba). */
export function throttleMessage(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  return `Demasiados intentos fallidos. Vuelve a probar en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
}
