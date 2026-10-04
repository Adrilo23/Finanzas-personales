import type { Metadata } from 'next'
import { getMonthlyEvolution } from '@/lib/reports'
import { ChartColumnIcon } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'
import { EvolutionChart } from './evolution-chart'

export const metadata: Metadata = { title: 'Evolución' }

const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

export default async function ReportsPage() {
  const data = await getMonthlyEvolution()

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
      hint: activeMonths > 0 ? `Gasto medio: ${euro.format(avgExpense)}/mes` : undefined,
    },
  ]

  return (
    <PageShell>
      <PageHeader title="Evolución" description="Los últimos 12 meses, incluido el actual." />

      {activeMonths === 0 ? (
        <EmptyState
          icon={ChartColumnIcon}
          title="Todavía no hay nada que mostrar"
          description="Cuando registres movimientos verás aquí cómo evolucionan tus ingresos, gastos e inversión mes a mes."
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

          <EvolutionChart data={data} />

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
                      Mes
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
                        {p.month}
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
