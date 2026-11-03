import type { Metadata } from 'next'
import { getMonthlyEvolution, getYearlyEvolution } from '@/lib/reports'
import Link from 'next/link'
import { CalendarRangeIcon, ChartColumnIcon, FileTextIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'
import { EvolutionChart } from './evolution-chart'

export const metadata: Metadata = { title: 'Evolución' }

const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

type View = 'mensual' | 'anual'

const VIEWS: { value: View; label: string }[] = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'anual', label: 'Anual' },
]

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>
}) {
  const view: View = (await searchParams).vista === 'anual' ? 'anual' : 'mensual'
  const yearly = view === 'anual'
  const data = yearly ? await getYearlyEvolution() : await getMonthlyEvolution()

  const totals = data.reduce(
    (acc, p) => ({
      ingresos: acc.ingresos + p.ingresos,
      gastos: acc.gastos + p.gastos,
      inversion: acc.inversion + p.inversion,
      balance: acc.balance + p.balance,
    }),
    { ingresos: 0, gastos: 0, inversion: 0, balance: 0 }
  )
  const activeMonths = data.filter((p) => p.ingresos || p.gastos || p.inversion).length
  const savingsRate = totals.ingresos > 0 ? (totals.balance / totals.ingresos) * 100 : null
  const avgExpense = activeMonths > 0 ? totals.gastos / activeMonths : 0

  const stats = [
    { label: 'Ingresos', value: euro.format(totals.ingresos), dot: 'bg-chart-1' },
    { label: 'Inversión', value: euro.format(totals.inversion), dot: 'bg-chart-2' },
    { label: 'Gastos', value: euro.format(totals.gastos), dot: 'bg-chart-3' },
    {
      label: 'Tasa de ahorro',
      value:
        savingsRate === null
          ? '—'
          : `${savingsRate.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`,
      hint:
        activeMonths > 0
          ? `Gasto medio: ${euro.format(avgExpense)}/${yearly ? 'año' : 'mes'}`
          : undefined,
    },
  ]

  return (
    <PageShell>
      <PageHeader
        title="Evolución"
        description={
          yearly
            ? 'Cada año desde tu primer movimiento, incluido el actual (hasta hoy).'
            : 'Los últimos 12 meses, incluido el actual.'
        }
        actions={
          <>
            <Link href="/reports/monthly" className={buttonVariants({ variant: 'outline' })}>
              <FileTextIcon data-icon="inline-start" />
              Informe mensual
            </Link>
            <Link href="/reports/annual" className={buttonVariants({ variant: 'outline' })}>
              <CalendarRangeIcon data-icon="inline-start" />
              Informe anual
            </Link>
          </>
        }
      />

      <nav aria-label="Periodo" className="grid w-full max-w-xs grid-cols-2 gap-1 rounded-[11px] bg-muted p-1">
        {VIEWS.map((v) => {
          const active = v.value === view
          return (
            <Link
              key={v.value}
              href={v.value === 'anual' ? '/reports?vista=anual' : '/reports'}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-8 items-center justify-center rounded-lg text-[0.8125rem] font-medium transition-[background-color,color,box-shadow] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                active
                  ? 'bg-card text-foreground shadow-[0_1px_2px_oklch(0.3_0.02_75/0.1),0_0_0_1px_oklch(0.3_0.02_75/0.05)] dark:bg-secondary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {v.label}
            </Link>
          )
        })}
      </nav>

      {activeMonths === 0 ? (
        <EmptyState
          icon={ChartColumnIcon}
          title="Todavía no hay nada que mostrar"
          description={`Cuando registres movimientos verás aquí cómo evolucionan tus ingresos, gastos e inversión ${yearly ? 'año a año' : 'mes a mes'}.`}
        />
      ) : (
        <>
          <dl className="surface grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  'p-4 sm:p-5',
                  i % 2 === 1 && 'border-l border-border/70',
                  i >= 2 && 'border-t border-border/70 lg:border-t-0',
                  i === 2 && 'lg:border-l'
                )}
              >
                <dt className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                  {s.dot && <span aria-hidden className={cn('size-2 rounded-[3px]', s.dot)} />}
                  {s.label}
                </dt>
                <dd className="num mt-1.5 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                  {s.value}
                </dd>
                {s.hint && <dd className="mt-1 text-xs text-muted-foreground">{s.hint}</dd>}
              </div>
            ))}
          </dl>

          <EvolutionChart data={data} title={yearly ? 'Por año' : 'Por mes'} />

          <details className="group surface overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-medium outline-none select-none hover:bg-muted/40 focus-visible:bg-muted/60 sm:px-6 [&::-webkit-details-marker]:hidden">
              Ver los datos en tabla
              <span
                aria-hidden
                className="text-muted-foreground transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="overflow-x-auto border-t border-border/70">
              <table className="num w-full text-right text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-left font-medium sm:px-6">
                      {yearly ? 'Año' : 'Mes'}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Ingresos
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Inversión
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Gastos
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium sm:px-6">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[...data].reverse().map((p) => (
                    <tr key={p.month}>
                      <th
                        scope="row"
                        className="px-4 py-2 text-left font-medium capitalize sm:px-6"
                      >
                        {yearly ? (
                          <Link
                            href={`/reports/annual?year=${p.month}`}
                            className="underline-offset-2 hover:text-brand hover:underline"
                          >
                            {p.month}
                          </Link>
                        ) : (
                          p.month
                        )}
                      </th>
                      <td className="px-3 py-2">{euro.format(p.ingresos)}</td>
                      <td className="px-3 py-2">{euro.format(p.inversion)}</td>
                      <td className="px-3 py-2">{euro.format(p.gastos)}</td>
                      <td
                        className={cn(
                          'px-4 py-2 font-medium sm:px-6',
                          p.balance < 0 ? 'text-negative' : p.balance > 0 && 'text-positive'
                        )}
                      >
                        {euro.format(p.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </PageShell>
  )
}
