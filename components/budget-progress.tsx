import { CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react'
import type { BudgetStatus } from '@/lib/budgets'
import { cn } from '@/lib/utils'

export const BUDGET_STATUS_META: Record<
  BudgetStatus,
  { label: string; icon: LucideIcon; text: string; soft: string; bar: string }
> = {
  ok: {
    label: 'En margen',
    icon: CircleCheckIcon,
    text: 'text-positive',
    soft: 'bg-positive-soft',
    bar: 'bg-positive',
  },
  warning: {
    label: 'Cerca del límite',
    icon: TriangleAlertIcon,
    text: 'text-warning',
    soft: 'bg-warning-soft',
    bar: 'bg-warning',
  },
  over: {
    label: 'Superado',
    icon: CircleAlertIcon,
    text: 'text-negative',
    soft: 'bg-negative-soft',
    bar: 'bg-negative',
  },
}

/** Etiqueta de estado: siempre icono + texto, nunca solo color. */
export function BudgetStatusBadge({
  status,
  className,
}: {
  status: BudgetStatus
  className?: string
}) {
  const meta = BUDGET_STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium',
        meta.soft,
        meta.text,
        className
      )}
    >
      <Icon aria-hidden className="size-3" strokeWidth={2.25} />
      {meta.label}
    </span>
  )
}

export function BudgetBar({
  ratio,
  status,
  className,
}: {
  ratio: number
  status: BudgetStatus
  className?: string
}) {
  const pct = Math.round(ratio * 100)
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(pct, 100)}
      aria-valuetext={`${pct} % del presupuesto`}
      className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          BUDGET_STATUS_META[status].bar
        )}
        style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }}
      />
    </div>
  )
}
