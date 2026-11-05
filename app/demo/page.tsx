import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftIcon, EyeIcon } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { buildDemo } from '@/lib/demo-data'
import { formatMonthYear, formatShortDate } from '@/lib/format'
import { percentChange } from '@/lib/stats'
import { PageHeader, PageShell } from '@/components/page-header'
import { Amount } from '@/components/amount'
import { AccountIcon } from '@/components/account-type'
import { CategoryBadge } from '@/components/category-type'
import { BudgetBar, BudgetStatusBadge } from '@/components/budget-progress'
import { GoalStatusBadge, goalBarStatus } from '@/components/goal-status'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EvolutionChart } from '../reports/evolution-chart'

export const metadata: Metadata = {
  title: 'Demo',
  description: 'Así se ve la app con un mes de ejemplo. Sin registrarte y sin guardar nada.',
}

/*
 * Demo pública de solo lectura (roadmap, Fase 4): el inicio de la app con datos de
 * ejemplo de lib/demo-data.ts. No consulta Supabase y no tiene acciones.
 */
export default function DemoPage() {
  const now = new Date()
  const demo = buildDemo(now)
  const { totals, previous } = demo
  const prevMonthShort = format(subMonths(demo.month, 1), 'MMM', { locale: es }).replace('.', '')

  const outflow = totals.expense + totals.investment
  const base = Math.max(totals.income, outflow)
  const allocation = [
    { key: 'expense', label: 'Gastado', cents: totals.expense, color: 'bg-chart-3' },
    { key: 'investment', label: 'Invertido', cents: totals.investment, color: 'bg-chart-2' },
    { key: 'free', label: 'Disponible', cents: Math.max(demo.balanceCents, 0), color: 'bg-chart-1' },
  ].filter((s) => s.cents > 0)

  const stats = [
    { label: 'Ingresos', cents: totals.income, change: percentChange(totals.income, previous.income), upIsGood: true, dot: 'bg-chart-1' },
    { label: 'Gastos', cents: totals.expense, change: percentChange(totals.expense, previous.expense), upIsGood: false, dot: 'bg-chart-3' },
    { label: 'Inversión', cents: totals.investment, change: percentChange(totals.investment, previous.investment), upIsGood: true, dot: 'bg-chart-2' },
  ]

  const topCategories = demo.categorySpend.slice(0, 5)
  const maxCategory = topCategories[0]?.cents ?? 1

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-x-3 px-4 py-2.5 sm:gap-x-4 sm:px-6">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className="flex items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
          <p className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <EyeIcon aria-hidden className="hidden size-4 shrink-0 text-brand sm:block" />
            {/* La etiqueta de datos de ejemplo no se recorta nunca. */}
            <span className="font-medium sm:hidden">Demo · datos de ejemplo</span>
            <span className="hidden sm:inline">
              <span className="font-medium">Demo con datos de ejemplo.</span>
              <span className="text-muted-foreground"> Puedes mirar todo; no se guarda nada.</span>
            </span>
          </p>
          <Link href="/register" className={buttonVariants({ size: 'sm' })}>
            <span className="sm:hidden">Crear cuenta</span>
            <span className="hidden sm:inline">Crear cuenta gratis</span>
          </Link>
        </div>
      </div>

      <PageShell>
        <PageHeader
          title={formatMonthYear(demo.month)}
          description="Así se ve el inicio de la app con un mes de apuntes de ejemplo."
        />

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <section aria-labelledby="balance-mes" className="surface flex flex-col p-5 sm:p-7">
            <h2 id="balance-mes" className="text-sm text-muted-foreground">
              Balance del mes
            </h2>
            <Amount
              cents={demo.balanceCents}
              className="mt-1 block text-[2.75rem] leading-none font-semibold tracking-[-0.035em] sm:text-[3.5rem]"
            />
            <p className="mt-2 text-[0.8125rem] text-muted-foreground">Ingresos menos gastos e inversión</p>

            <div className="mt-7">
              <div
                className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
                role="img"
                aria-label={allocation.map((s) => `${s.label}: ${Math.round((s.cents / base) * 100)} %`).join(', ')}
              >
                {allocation.map((s) => (
                  <span
                    key={s.key}
                    className={cn('h-full first:rounded-l-full last:rounded-r-full', s.color)}
                    style={{ width: `${(s.cents / base) * 100}%` }}
                  />
                ))}
              </div>
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {allocation.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5">
                    <span aria-hidden className={cn('size-2 rounded-[3px]', s.color)} />
                    {s.label}
                    <span className="num font-medium text-foreground">{Math.round((s.cents / base) * 100)} %</span>
                  </li>
                ))}
              </ul>
            </div>

            <div aria-hidden className="min-h-7 flex-1" />
            <dl className="grid grid-cols-3 gap-3 border-t border-border/70 pt-5">
              {stats.map((s) => {
                const good = s.change !== null && (s.change >= 0 ? s.upIsGood : !s.upIsGood)
                return (
                  <div key={s.label} className="min-w-0">
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-[0.8125rem]">
                      <span aria-hidden className={cn('size-2 rounded-[3px]', s.dot)} />
                      {s.label}
                    </dt>
                    <dd>
                      <Amount cents={s.cents} className="mt-1 block truncate text-base font-semibold tracking-[-0.015em] sm:text-lg" />
                    </dd>
                    {s.change !== null && Math.abs(s.change) >= 0.5 && (
                      <dd className={cn('num mt-0.5 text-xs', good ? 'text-positive' : 'text-negative')}>
                        {s.change > 0 ? '↑' : '↓'}{' '}
                        {Math.abs(s.change).toLocaleString('es-ES', { maximumFractionDigits: 0 })} %
                        <span className="text-muted-foreground"> vs {prevMonthShort}</span>
                      </dd>
                    )}
                  </div>
                )
              })}
            </dl>
          </section>

          <section aria-labelledby="cuentas-resumen" className="surface flex flex-col p-5 sm:p-6">
            <h2 id="cuentas-resumen" className="text-sm text-muted-foreground">
              Saldo en cuentas
            </h2>
            <Amount cents={demo.netWorthCents} className="mt-1 block text-[2rem] leading-tight font-semibold tracking-[-0.03em]" />
            <ul className="mt-5 space-y-3">
              {demo.accounts.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <AccountIcon type={a.type} className="size-8" />
                  <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                  <Amount cents={a.balance_cents} className={cn('text-sm font-medium', a.balance_cents < 0 && 'text-negative')} />
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-5 text-xs text-muted-foreground">
              El bróker suma el valor actual de sus fondos.
            </p>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="presupuestos" className="surface p-5 sm:p-6">
            <h2 id="presupuestos" className="mb-4 text-[0.9375rem] font-semibold">
              Presupuestos
            </h2>
            <ul className="space-y-4">
              {demo.budgets.map((b) => (
                <li key={b.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">
                        {b.icon} {b.name}
                      </span>
                      {b.status !== 'ok' && <BudgetStatusBadge status={b.status} />}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      <Amount cents={b.spentCents} className="font-medium text-foreground" /><span className="hidden sm:inline"> / <Amount cents={b.budgetCents} /></span>
                    </span>
                  </div>
                  <BudgetBar ratio={b.ratio} status={b.status} className="h-1.5" />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="objetivos" className="surface p-5 sm:p-6">
            <h2 id="objetivos" className="mb-4 text-[0.9375rem] font-semibold">
              Objetivos de ahorro
            </h2>
            <ul className="space-y-5">
              {demo.goals.map((g) => (
                <li key={g.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">
                        {g.icon} {g.name}
                      </span>
                      <GoalStatusBadge status={g.status} />
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      <Amount cents={g.savedCents} className="font-medium text-foreground" /><span className="hidden sm:inline"> / <Amount cents={g.targetCents} /></span>
                    </span>
                  </div>
                  <BudgetBar ratio={g.ratio} status={goalBarStatus(g.status)} className="h-1.5" />
                  {g.requiredPerMonthCents !== null && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Para llegar a tiempo: <Amount cents={g.requiredPerMonthCents} />
                      /mes
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <EvolutionChart data={demo.evolution} title="Últimos 12 meses" />

        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="gasto-categoria" className="surface p-5 sm:p-6">
            <h2 id="gasto-categoria" className="mb-5 text-[0.9375rem] font-semibold">
              En qué se va el dinero
            </h2>
            <ul className="space-y-4">
              {topCategories.map((c) => (
                <li key={c.name}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">
                      {c.icon} {c.name}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      <span className="num text-xs text-muted-foreground">{Math.round((c.cents / totals.expense) * 100)} %</span>
                      <Amount cents={c.cents} className="font-medium" />
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-chart-3" style={{ width: `${Math.max((c.cents / maxCategory) * 100, 2)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="ultimos" className="surface p-5 sm:p-6">
            <h2 id="ultimos" className="mb-3 text-[0.9375rem] font-semibold">
              Últimos movimientos
            </h2>
            <ul className="-mx-2 divide-y divide-border/60">
              {demo.recent.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-2 py-2.5">
                  <CategoryBadge type={t.categories.type} emoji={t.categories.icon} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatShortDate(t.transaction_date)} · {t.account}
                    </p>
                  </div>
                  <Amount cents={t.amount_cents} signed className="text-sm font-semibold" />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="surface flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.015em]">¿Te sirve? Empieza con tus cuentas.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crear una cuenta es gratis. Tus apuntes solo los ves tú.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/register" className={buttonVariants()}>
              Crear cuenta gratis
            </Link>
            <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
              Entrar
            </Link>
          </div>
        </section>
      </PageShell>
    </>
  )
}
