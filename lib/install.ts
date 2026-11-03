/**
 * Detección del dispositivo para la guía de instalación de la PWA. Parte pura
 * (recibe el user agent), para poder testearla.
 */
export type InstallPlatform = 'ios' | 'android' | 'desktop'

export function detectPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  // iPadOS se presenta como Mac de escritorio; se distingue por la pantalla táctil.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'desktop'
}
