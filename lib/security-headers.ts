/**
 * Cabeceras de seguridad. La CSP lleva un nonce por petición (la genera proxy.ts) y
 * las demás son fijas (next.config.ts). Lógica pura, para poder testearla.
 */

/**
 * Content-Security-Policy de las páginas (auditoría F-01/F-02).
 * - Scripts: solo con el nonce de la petición ('strict-dynamic' deja cargar los chunks
 *   que esos scripts piden). En desarrollo React necesita 'unsafe-eval'.
 * - Estilos: 'unsafe-inline' porque Recharts, Radix y las barras de progreso usan el
 *   atributo style, que un nonce no cubre. No permite ejecutar código.
 * - connect-src: la propia app y Supabase (subida de adjuntos con URL firmada).
 * - frame-ancestors 'none': nadie puede enmarcar la app (clickjacking).
 */
export function buildCsp({
  nonce,
  supabaseUrl,
  isDev,
}: {
  nonce: string
  supabaseUrl: string | undefined
  isDev: boolean
}): string {
  let supabaseOrigin = ''
  try {
    if (supabaseUrl) supabaseOrigin = new URL(supabaseUrl).origin
  } catch {
    // URL mal configurada: sin origen extra (la subida de adjuntos fallará y se verá).
  }

  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])]],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'blob:', 'data:']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...(supabaseOrigin ? [supabaseOrigin] : [])]],
    ['worker-src', ["'self'"]],
    ['manifest-src', ["'self'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ]
  const policy = directives.map(([name, values]) => `${name} ${values.join(' ')}`)
  // En local se sirve por http: forzar https rompería la app en desarrollo.
  if (!isDev) policy.push('upgrade-insecure-requests')
  return policy.join('; ')
}

/** Cabeceras fijas para todas las respuestas (auditoría F-01/F-03). */
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
]
