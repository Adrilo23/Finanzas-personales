import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/** "4 oct 2026" a partir de una fecha 'yyyy-MM-dd'. */
export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), 'd MMM yyyy', { locale: es })
}

/** Cabecera de grupo en listas de movimientos: "Hoy", "Ayer" o "sábado, 2 de octubre". */
export function formatDayHeading(isoDate: string): string {
  const date = parseISO(isoDate)
  if (isToday(date)) return 'Hoy'
  if (isYesterday(date)) return 'Ayer'
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return format(date, sameYear ? "EEEE, d 'de' MMMM" : "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  })
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: es })
}

/** Interés o porcentaje dado en % ("3" → "3 %", "2.25" → "2,25 %"). */
export function formatPercent(percent: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 3 }).format(
    percent / 100
  )
}
