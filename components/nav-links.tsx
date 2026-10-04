'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DropdownMenu } from 'radix-ui'
import {
  ArrowLeftRightIcon,
  ChartColumnIcon,
  ChevronRightIcon,
  EllipsisIcon,
  HouseIcon,
  LogOutIcon,
  PiggyBankIcon,
  RepeatIcon,
  TagIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'
import { logout } from '@/app/login/actions'
import { BrandMark } from '@/components/brand-mark'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  /** Texto corto para la barra inferior del móvil. */
  short?: string
  icon: LucideIcon
  /** En móvil, va en la barra inferior (true) o dentro de «Más» (false). */
  primary: boolean
}

/** Orden de la barra superior (escritorio). Si añades una sección, añádela aquí. */
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Inicio', icon: HouseIcon, primary: true },
  {
    href: '/transactions',
    label: 'Movimientos',
    short: 'Movim.',
    icon: ArrowLeftRightIcon,
    primary: true,
  },
  { href: '/accounts', label: 'Cuentas', icon: WalletIcon, primary: true },
  { href: '/budgets', label: 'Presupuestos', short: 'Presup.', icon: PiggyBankIcon, primary: true },
  { href: '/reports', label: 'Evolución', icon: ChartColumnIcon, primary: false },
  { href: '/recurring', label: 'Recurrentes', icon: RepeatIcon, primary: false },
  { href: '/categories', label: 'Categorías', icon: TagIcon, primary: false },
]

const PRIMARY_ITEMS = NAV_ITEMS.filter((item) => item.primary)
const MORE_ITEMS = NAV_ITEMS.filter((item) => !item.primary)

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg text-[0.9375rem] font-semibold tracking-[-0.01em] outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <BrandMark />
            Finanzas
          </Link>

          <nav aria-label="Principal" className="hidden flex-1 lg:block">
            <ul className="flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'block rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                        active
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <UserMenu email={email} />
        </div>
      </header>

      {/* Barra inferior en móvil y tablet (PWA): lo más usado a un toque del pulgar. */}
      <nav
        aria-label="Principal"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/85 backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {PRIMARY_ITEMS.map((item) => (
            <li key={item.href}>
              <TabLink
                href={item.href}
                label={item.short ?? item.label}
                icon={item.icon}
                active={isActive(pathname, item.href)}
              />
            </li>
          ))}
          <li>
            <MoreSheet pathname={pathname} />
          </li>
        </ul>
      </nav>
    </>
  )
}

function TabContent({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon
  label: string
  active: boolean
}) {
  return (
    <>
      <span
        className={cn(
          'grid h-7 w-11 place-items-center rounded-full transition-colors duration-200',
          active && 'bg-brand-soft text-brand'
        )}
      >
        <Icon aria-hidden className="size-[1.15rem]" strokeWidth={active ? 2.25 : 1.75} />
      </span>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </>
  )
}

const tabClass = (active: boolean) =>
  cn(
    'flex w-full flex-col items-center gap-1 pt-2.5 pb-2 text-[0.6875rem] font-medium transition-colors duration-150 outline-none focus-visible:bg-muted',
    active ? 'text-foreground' : 'text-muted-foreground'
  )

function TabLink({
  href,
  label,
  icon,
  active,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
}) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
      <TabContent icon={icon} label={label} active={active} />
    </Link>
  )
}

/** Pestaña «Más»: hoja inferior con las secciones que no caben en la barra. */
function MoreSheet({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false)
  const active = MORE_ITEMS.some((item) => isActive(pathname, item.href))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={tabClass(active)} aria-label="Más secciones">
        <TabContent icon={EllipsisIcon} label="Más" active={active} />
      </DialogTrigger>
      <DialogContent className="gap-3">
        <DialogHeader>
          <DialogTitle>Más secciones</DialogTitle>
        </DialogHeader>
        <ul className="-mx-2">
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon
            const itemActive = isActive(pathname, item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={itemActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-2 py-2.5 text-[0.9375rem] font-medium outline-none hover:bg-muted focus-visible:bg-muted',
                    itemActive && 'bg-muted'
                  )}
                >
                  <span className="grid size-9 place-items-center rounded-[10px] bg-muted text-foreground/70">
                    <Icon aria-hidden className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

function UserMenu({ email }: { email: string }) {
  const initial = email.charAt(0).toUpperCase() || '?'

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="ml-auto grid size-8 place-items-center rounded-full bg-muted text-[0.8125rem] font-semibold text-foreground ring-1 ring-border transition-[box-shadow,transform] duration-150 outline-none hover:ring-input focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[0.96]"
        aria-label="Menú de usuario"
      >
        {initial}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 origin-(--radix-dropdown-menu-content-transform-origin) rounded-xl bg-popover p-1.5 text-sm text-popover-foreground shadow-(--shadow-pop) outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.97]"
        >
          <div className="px-2.5 pt-1.5 pb-2">
            <p className="eyebrow">Sesión iniciada como</p>
            <p className="truncate font-medium">{email}</p>
          </div>
          <DropdownMenu.Separator className="-mx-1.5 my-1 h-px bg-border" />
          <form action={logout}>
            <DropdownMenu.Item asChild>
              <button
                type="submit"
                className="flex w-full cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-left outline-none data-highlighted:bg-muted"
              >
                <LogOutIcon aria-hidden className="size-4 text-muted-foreground" />
                Cerrar sesión
              </button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
