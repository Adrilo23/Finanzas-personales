import type { CookieOptionsWithName } from '@supabase/ssr'

/**
 * Cookies de sesión de Supabase. @supabase/ssr las crea legibles desde JavaScript para
 * que funcione su cliente de navegador; aquí no hay cliente de navegador (todo pasa por
 * el servidor), así que van HttpOnly: un XSS no podría robar el access ni el refresh
 * token. Secure en producción (en local se sirve por http). Auditoría F-04.
 */
export const SESSION_COOKIE_OPTIONS: CookieOptionsWithName = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // Igual que el valor por defecto de @supabase/ssr; la sesión real la limita Supabase Auth.
  maxAge: 400 * 24 * 60 * 60,
}

/**
 * Fuerza los flags de seguridad sobre las opciones que trae @supabase/ssr al escribir
 * una cookie, sin tocar maxAge/expires: al cerrar sesión las borra con maxAge 0.
 */
export function withSessionFlags<T extends object>(
  options: T | undefined
): T & { httpOnly: true; secure: boolean | undefined; sameSite: 'lax' } {
  return {
    ...((options ?? {}) as T),
    httpOnly: true,
    secure: SESSION_COOKIE_OPTIONS.secure,
    sameSite: 'lax' as const,
  }
}
