import { formatCents } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * Importe con cifras tabulares. Con `signed`, los positivos llevan "+" y
 * se colorean (verde / rojo); el signo ya viene del servidor.
 */
export function Amount({
  cents,
  currency,
  signed = false,
  className,
}: {
  cents: number
  currency?: string
  signed?: boolean
  className?: string
}) {
  const text = formatCents(cents, currency)
  return (
    <span
      className={cn(
        'num whitespace-nowrap',
        signed && (cents > 0 ? 'text-positive' : cents < 0 ? 'text-foreground' : 'text-muted-foreground'),
        className
      )}
    >
      {signed && cents > 0 ? `+${text}` : text}
    </span>
  )
}
