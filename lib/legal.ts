/**
 * Datos del titular que muestran las páginas legales (/privacy y /terms). Cambiarlos aquí
 * basta. Si la app pasa a ser de pago o la explota una empresa, hay que completar el
 * aviso legal (nombre completo o razón social, NIF y domicilio): la LSSI-CE lo exige a
 * quien presta un servicio con actividad económica.
 */
export const LEGAL = {
  /** Nombre del responsable del servicio. */
  ownerName: 'Adrián',
  /** Correo de contacto para consultas y para ejercer derechos sobre los datos. */
  contactEmail: 'adriloza923@gmail.com',
  /** Última revisión de los textos legales (yyyy-MM-dd). */
  updated: '2026-11-08',
} as const

/** «8 de noviembre de 2026» a partir de yyyy-MM-dd, sin depender de la zona horaria. */
export function formatLegalDate(isoDate: string): string {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${day} de ${months[month - 1]} de ${year}`
}
