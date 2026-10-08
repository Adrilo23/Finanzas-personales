import { CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react'
import type { GoalStatus } from '@/lib/goals'
import type { BudgetStatus } from '@/lib/budgets'
import { cn } from '@/lib/utils'

const META: Record<
  Exclude<GoalStatus, 'no_deadline'>,
  { label: string; icon: LucideIcon; text: string; soft: string }
> = {
  completed: {
    label: 'Cumplido',
    icon: CircleCheckIcon,
    text: 'text-positive',
    soft: 'bg-positive-soft',
  },
  on_track: {
    label: 'Vas a tiempo',
    icon: CircleCheckIcon,
    text: 'text-positive',
    soft: 'bg-positive-soft',
  },
  behind: {
    label: 'Vas con retraso',
    icon: TriangleAlertIcon,
    text: 'text-warning',
    soft: 'bg-warning-soft',
  },
  overdue: {
    label: 'Fecha superada',
    icon: CircleAlertIcon,
    text: 'text-negative',
    soft: 'bg-negative-soft',
  },
}

/** Etiqueta del estado de un objetivo (icono + texto). Sin fecha no hay estado que mostrar. */
export function GoalStatusBadge({ status, className }: { status: GoalStatus; className?: string }) {
  if (status === 'no_deadline') return null
  const meta = META[status]
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

/** Color de la barra de progreso (reutiliza la de presupuestos). */
export function goalBarStatus(status: GoalStatus): BudgetStatus {
  if (status === 'behind') return 'warning'
  if (status === 'overdue') return 'over'
  return 'ok'
}
