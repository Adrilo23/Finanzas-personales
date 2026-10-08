import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, FileTextIcon } from 'lucide-react'
import { format } from 'date-fns'
import { adjacentMonths, getMonthlyReport, parseMonthParam } from '@/lib/monthly-report'
import { formatMonthYear } from '@/lib/format'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Amount } from '@/components/amount'
import { BudgetBar, BudgetStatusBadge } from '@/components/budget-progress'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Informe mensual' }

function Change({ value, upIsGood }: { value: number | null; upIsGood: boolean }) {
  if (value === null) return <span className="text-xs text-muted-foreground">Sin mes anterior</span>
  const rounded = Math.round(value)
  const good = rounded === 0 ? null : rounded > 0 === upIsGood
  return (
    <span
      className={cn(
        'text-xs',
        good === null ? 'text-muted-foreground' : good ? 'text-positive' : 'text-negative'
      )}
    >
      {rounded > 0 ? '+' : ''}
      {rounded} % vs. mes anterior
    </span>
  )
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const now = new Date()
  const month = parseMonthParam((await searchParams).month, now)
  const key = format(month, 'yyyy-MM')
  const { prev, next } = adjacentMonths(month, now)
  const report = await getMonthlyReport(month)
  const navClass = buttonVariants({ variant: 'outline', size: 'icon-sm' })

  const stats = [
    { label: 'Ingresos', cents: report.totals.income, change: report.changes.income, upIsGood: true, dot: 'bg-chart-1' },
    { label: 'Gastos', cents: report.totals.expense, change: report.changes.expense, upIsGood: false, dot: 'bg-chart-3' },
    { label: 'Inversión', cents: report.totals.investment, change: report.changes.investment, upIsGood: true, dot: 'bg-chart-2' },
  ]

  return (
    <PageShell>
      <PageHeader
        title={`Informe de ${formatMonthYear(month)}`}
        description="Resumen del mes: lo que entró, lo que salió y cómo vas con tus presupuestos y objetivos."
        actions={
          <>
            <Link href={`/reports/monthly?month=${prev}`} className={navClass} aria-label="Mes anterior">
              <ChevronLeftIcon />
            </Link>
            {next ? (
              <Link href={`/reports/monthly?month=${next}`} className={navClass} aria-label="Mes siguiente">
                <ChevronRightIcon />
              </Link>
            ) : (
              <span aria-hidden className={cn(navClass, 'pointer-events-none opacity-40')}>
                <ChevronRightIcon />
              </span>
            )}
            <a
              href={`/reports/monthly/export?month=${key}`}
              className={buttonVariants({ variant: 'default' })}
            >
              <DownloadIcon data-icon="inline-start" />
              Descargar PDF
            </a>
          </>
        }
      />

      {!report.hasData ? (
        <EmptyState
          icon={FileTextIcon}
          title="Sin movimientos este mes"
          description="Cuando registres ingresos o gastos de este mes, aquí tendrás su informe."
        />
      ) : (
        <>
          <section className="surface grid gap-5 p-5 sm:p-7">
            <div>
              <h2 className="text-sm text-muted-foreground">Balance del mes</h2>
              <Amount
                cents={report.balanceCents}
                className={cn(
                  'mt-1 block text-[2.5rem] leading-none font-semibold tracking-[-0.035em]',
                  report.balanceCents < 0 && 'text-negative'
                )}
              />
              <p className="mt-2 text-[0.8125rem] text-muted-foreground">
                {report.savingsRate === null
                  ? 'Sin ingresos este mes, no hay tasa de ahorro.'
                  : `Has ahorrado el ${(report.savingsRate * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} % de tus ingresos.`}
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                    <span aria-hidden className={cn('size-2 rounded-[3px]', s.dot)} />
                    {s.label}
                  </dt>
                  <dd className="mt-1">
                    <Amount cents={s.cents} className="text-xl font-semibold tracking-[-0.02em]" />
                  </dd>
                  <dd>
                    <Change value={s.change} upIsGood={s.upIsGood} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {report.topCategories.length > 0 && (
            <section aria-labelledby="gasto-categoria" className="surface p-5 sm:p-6">
              <h2 id="gasto-categoria" className="mb-4 text-base font-semibold">
                Gasto por categoría
              </h2>
              <ul className="grid gap-3">
                {report.topCategories.map((c) => (
                  <li key={c.name}>
                    <p className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">
                        {c.icon && <span aria-hidden>{c.icon} </span>}
                        {c.name}
                      </span>
                      <span className="shrink-0">
                        <Amount cents={c.cents} className="font-medium" />
                        <span className="num text-muted-foreground">
                          {' '}
                          · {Math.round(c.share * 100)} %
                        </span>
                      </span>
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-chart-3" style={{ width: `${c.share * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.topExpenses.length > 0 && (
            <section aria-labelledby="mayores-gastos" className="surface p-5 sm:p-6">
              <h2 id="mayores-gastos" className="mb-3 text-base font-semibold">
                Mayores gastos
              </h2>
              <ul className="divide-y divide-border/60">
                {report.topExpenses.map((e, i) => (
                  <li key={i} className="flex items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      {e.description}
                      <span className="text-muted-foreground"> · {e.category}</span>
                    </span>
                    <Amount cents={-e.cents} className="font-medium" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.budgets.length > 0 && (
            <section aria-labelledby="presupuestos" className="surface p-5 sm:p-6">
              <h2 id="presupuestos" className="mb-1 text-base font-semibold">
                Presupuestos
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Se comparan con los límites actuales; los presupuestos no guardan histórico.
              </p>
              <ul className="grid gap-4 sm:grid-cols-2">
                {report.budgets.map((b) => (
                  <li key={b.id}>
                    <p className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{b.name}</span>
                      <BudgetStatusBadge status={b.status} />
                    </p>
                    <BudgetBar ratio={b.ratio} status={b.status} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Amount cents={b.spentCents} /> de <Amount cents={b.budgetCents} />
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.goals.length > 0 && (
            <section aria-labelledby="objetivos" className="surface p-5 sm:p-6">
              <h2 id="objetivos" className="mb-3 text-base font-semibold">
                Objetivos de ahorro
              </h2>
              <ul className="divide-y divide-border/60">
                {report.goals.map((g) => (
                  <li key={g.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate">{g.name}</span>
                    <Amount cents={g.netCents} signed className="font-medium" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-muted-foreground">
            Los traspasos entre cuentas no cuentan como ingreso ni gasto.
          </p>
        </>
      )}
    </PageShell>
  )
}
