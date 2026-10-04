import { cn } from '@/lib/utils'

/** Logotipo: tres barras ascendentes sobre un cuadrado redondeado. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7', className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <rect x="8" y="17" width="4" height="7" rx="1.5" className="fill-primary-foreground/55" />
      <rect x="14" y="13" width="4" height="11" rx="1.5" className="fill-primary-foreground/80" />
      <rect x="20" y="8" width="4" height="16" rx="1.5" className="fill-brand" />
    </svg>
  )
}
