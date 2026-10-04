import {
  BanknoteIcon,
  CreditCardIcon,
  LandmarkIcon,
  TrendingUpIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCOUNT_TYPE_ICONS: Record<string, LucideIcon> = {
  bank: LandmarkIcon,
  cash: BanknoteIcon,
  card: CreditCardIcon,
  investment: TrendingUpIcon,
  other: WalletIcon,
}

export function AccountIcon({ type, className }: { type: string | null; className?: string }) {
  const Icon = ACCOUNT_TYPE_ICONS[type ?? 'other'] ?? WalletIcon
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-[10px] bg-muted text-foreground/70',
        className
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  )
}
