import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  TrendingUpIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type CategoryType = 'income' | 'expense' | 'investment'

export const CATEGORY_TYPE_META: Record<
  CategoryType,
  { label: string; plural: string; icon: LucideIcon; text: string; soft: string }
> = {
  income: {
    label: 'Ingreso',
    plural: 'Ingresos',
    icon: ArrowDownLeftIcon,
    text: 'text-positive',
    soft: 'bg-positive-soft',
  },
  expense: {
    label: 'Gasto',
    plural: 'Gastos',
    icon: ArrowUpRightIcon,
    text: 'text-negative',
    soft: 'bg-negative-soft',
  },
  investment: {
    label: 'Inversión',
    plural: 'Inversión',
    icon: TrendingUpIcon,
    text: 'text-invest',
    soft: 'bg-invest-soft',
  },
}

export function isCategoryType(value: string | null | undefined): value is CategoryType {
  return value === 'income' || value === 'expense' || value === 'investment'
}

/**
 * Icono cuadrado de una categoría: su emoji si lo tiene; si no, la flecha de su tipo.
 * El color de fondo indica el tipo (ingreso / gasto / inversión).
 */
export function CategoryBadge({
  type,
  emoji,
  className,
}: {
  type: string | null | undefined
  emoji?: string | null
  className?: string
}) {
  const meta = isCategoryType(type) ? CATEGORY_TYPE_META[type] : null
  const Icon = meta?.icon
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-[10px] text-base',
        meta ? cn(meta.soft, meta.text) : 'bg-muted text-muted-foreground',
        className
      )}
    >
      {emoji ? emoji : Icon ? <Icon className="size-4" strokeWidth={2} /> : '·'}
    </span>
  )
}

/** Icono de un traspaso entre cuentas propias (no es ingreso ni gasto). */
export function TransferBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-[10px] bg-muted text-foreground/70',
        className
      )}
    >
      <ArrowLeftRightIcon className="size-4" strokeWidth={2} />
    </span>
  )
}
