/**
 * Ruta de destino tras el login/confirmación: solo rutas internas. `next=@evil.com` o
 * `next=//evil.com` darían un redirect a otro sitio si se concatenan al origen
 * (auditoría B1), así que cualquier cosa que no sea «/ruta» vuelve al inicio.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/')) return '/'
  // `//host` y `/\host` los trata el navegador como otro origen.
  if (next.startsWith('//') || next.includes('\\')) return '/'
  // Caracteres de control: división de cabeceras / URLs raras.
  if (/[\u0000-\u001f\u007f]/.test(next)) return '/'
  return next
}
