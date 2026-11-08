/**
 * Rutas accesibles sin sesión (proxy.ts redirige el resto a /login).
 * - Por prefijo: la ruta y todo lo que cuelga de ella.
 * - Exactas: solo esa ruta. «/» es la landing; si fuera prefijo, abriría la app entera.
 */
const PUBLIC_PREFIXES = ['/login', '/register', '/auth/callback', '/offline', '/help', '/demo', '/privacy']
const PUBLIC_EXACT = ['/']

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
