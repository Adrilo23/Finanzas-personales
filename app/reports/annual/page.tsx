import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, FileTextIcon } from 'lucide-react'
import { adjacentYears, getAnnualReport, parseYearParam } from '@/lib/annual-report'
import { formatShortDate } from '@/lib/format'
import { formatCents } from '@/lib/money'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Amount } from '@/components/amount'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Informe anual' }

const pct = (value: number) =>
  `${(value * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`

/** Variación frente al año anterior, en verde o rojo según si subir es bueno. */
function Change({
  value,
  upIsGood,
  vs,
}: {
  value: number | null
  upIsGood: boolean
  vs: string
}) {
  if (value === null) return <span className="text-xs text-muted-foreground">Sin datos de {vs}</span>
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
      {rounded} % vs. {vs}
    </span>
  )
}

export default async function AnnualReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const now = new Date()
  const year = parseYearParam((await searchParams).year, now)
  const { prev, next } = adjacentYears(year, now)
  const report = await getAnnualReport(year, now)
  const navClass = buttonVariants({ variant: 'outline', size: 'icon-sm' })
  // En el año en curso se compara con el mismo periodo del anterior.
  const vs = report.partial ? `mismo periodo de ${year - 1}` : String(year - 1)

  const stats = [
    { label: 'Ingresos', cents: report.totals.income, prevCents: report.previous.income, change: report.changes.income, upIsGood: true, dot: 'bg-chart-1' },
    { label: 'Inversión', cents: report.totals.investment, prevCents: report.previous.investment, change: report.changes.investment, upIsGood: true, dot: 'bg-chart-2' },
    { label: 'Gastos', cents: report.totals.expense, prevCents: report.previous.expense, change: report.changes.expense, upIsGood: false, dot: 'bg-chart-3' },
  ]
  const maxCategory = Math.max(1, ...report.categories.map((c) => Math.max(c.cents, c.previousCents)))
  const visibleMonths = report.partial
    ? report.months.filter((m) => m.key <= report.through.slice(0, 7))
    : report.months

  return (
    <PageShell>
      <PageHeader
        title={`Informe de ${year}`}
        description={
          report.partial
            ? `Año en curso, hasta el ${formatShortDate(report.through)}, comparado con el mismo periodo de ${year - 1}.`
            : `El año completo comparado con ${year - 1}.`
        }
        actions={
          <>
            <Link href={`/reports/annual?year=${prev}`} className={navClass} aria-label="Año anterior">
              <ChevronLeftIcon />
            </Link>
            {next ? (
              <Link href={`/reports/annual?year=${next}`} className={navClass} aria-label="Año siguiente">
                <ChevronRightIcon />
              </Link>
            ) : (
              <span aria-hidden className={cn(navClass, 'pointer-events-none opacity-40')}>
                <ChevronRightIcon />
              </span>
            )}
            <a href={`/reports/annual/export?year=${year}`} className={buttonVariants({ variant: 'default' })}>
              <DownloadIcon data-icon="inline-start" />
              Descargar PDF
            </a>
          </>
        }
      />

      {!report.hasData ? (
        <EmptyState
          icon={FileTextIcon}
          title={`Sin movimientos en ${year}`}
          description="Cuando registres ingresos o gastos de este año, aquí tendrás su informe."
        />
      ) : (
        <>
          <section className="surface grid gap-5 p-5 sm:p-7">
            <div>
              <h2 className="text-sm text-muted-foreground">Balance del año</h2>
              <Amount
                cents={report.balanceCents}
                className={cn(
                  'mt-1 block text-[2.5rem] leading-none font-semibold tracking-[-0.035em]',
                  report.balanceCents < 0 && 'text-negative'
                )}
              />
              <p className="mt-2 text-[0.8125rem] text-muted-foreground">
                {report.savingsRate === null
                  ? 'Sin ingresos este año, no hay tasa de ahorro.'
                  : `Has ahorrado el ${pct(report.savingsRate)} de tus ingresos`}
                {report.savingsRate !== null &&
                  (report.previousSavingsRate === null
                    ? '.'
                    : ` (${pct(report.previousSavingsRate)} en ${vs}).`)}
              </p>
              <p className="mt-1">
                <Change value={report.changes.balance} upIsGood vs={vs} />
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
                  <dd className="text-xs text-muted-foreground">
                    <Amount cents={s.prevCents} /> en {vs}
                  </dd>
                  <dd>
                    <Change value={s.change} upIsGood={s.upIsGood} vs={vs} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {report.categories.length > 0 && (
            <section aria-labelledby="gasto-categoria" className="surface p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="gasto-categoria" className="text-base font-semibold">
                  Gasto por categoría
                </h2>
                <ul className="flex gap-4 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <span aria-hidden className="h-2 w-3 rounded-full bg-chart-3" />
                    {year}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span aria-hidden className="h-2 w-3 rounded-full bg-chart-3/35" />
                    {report.partial ? `${year - 1} (mismo periodo)` : year - 1}
                  </li>
                </ul>
              </div>
              <ul className="grid gap-4">
                {report.categories.map((c) => (
                  <li key={c.name}>
                    <p className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">
                        {c.icon && <span aria-hidden>{c.icon} </span>}
                        {c.name}
                      </span>
                      <span className="shrink-0 text-right">
                        <Amount cents={c.cents} className="font-medium" />
                        <span className="ml-2 inline-block min-w-14">
                          <CategoryChange value={c.change} hadPrevious={c.previousCents > 0} />
                        </span>
                      </span>
                    </p>
                    <div className="grid gap-1" aria-hidden>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-chart-3" style={{ width: `${(c.cents / maxCategory) * 100}%` }} />
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-chart-3/35" style={{ width: `${(c.previousCents / maxCategory) * 100}%` }} />
                      </div>
                    </div>
                    <p className="sr-only">
                      {c.previousCents > 0 ? `Frente a ${formatCents(c.previousCents)} en ${vs}` : `Sin gasto en ${vs}`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="por-mes" className="surface overflow-hidden">
            <h2 id="por-mes" className="px-5 pt-5 pb-3 text-base font-semibold sm:px-6">
              Mes a mes
            </h2>
            <div className="overflow-x-auto border-t border-border/70">
              <table className="num w-full text-right text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 text-left font-medium sm:px-6">Mes</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Ingresos</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Inversión</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Gastos</th>
                    <th scope="col" className="px-5 py-2.5 font-medium sm:px-6">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {visibleMonths.map((m) => (
                    <tr key={m.key}>
                      <th scope="row" className="px-5 py-2 text-left font-medium capitalize sm:px-6">
                        <Link
                          href={`/reports/monthly?month=${m.key}`}
                          className="underline-offset-2 hover:text-brand hover:underline"
                        >
                          {m.label}
                        </Link>
                      </th>
                      <td className="px-3 py-2"><Amount cents={m.income} /></td>
                      <td className="px-3 py-2"><Amount cents={m.investment} /></td>
                      <td className="px-3 py-2"><Amount cents={m.expense} /></td>
                      <td
                        className={cn(
                          'px-5 py-2 font-medium sm:px-6',
                          m.balance < 0 ? 'text-negative' : m.balance > 0 && 'text-positive'
                        )}
                      >
                        <Amount cents={m.balance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {report.topExpenses.length > 0 && (
            <section aria-labelledby="mayores-gastos" className="surface p-5 sm:p-6">
              <h2 id="mayores-gastos" className="mb-3 text-base font-semibold">
                Mayores gastos del año
              </h2>
              <ul className="divide-y divide-border/60">
                {report.topExpenses.map((e, i) => (
                  <li key={i} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{formatShortDate(e.date)}</span>
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

          {report.goals.length > 0 && (
            <section aria-labelledby="objetivos" className="surface p-5 sm:p-6">
              <h2 id="objetivos" className="mb-3 text-base font-semibold">
                Aportado a objetivos de ahorro
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

/** En gastos, subir es malo: rojo si sube, verde si baja. */
function CategoryChange({ value, hadPrevious }: { value: number | null; hadPrevious: boolean }) {
  if (!hadPrevious) return <span className="text-xs text-muted-foreground">nuevo</span>
  if (value === null) return null
  const rounded = Math.round(value)
  return (
    <span
      className={cn(
        'num text-xs',
        rounded === 0 ? 'text-muted-foreground' : rounded > 0 ? 'text-negative' : 'text-positive'
      )}
    >
      {rounded > 0 ? '+' : ''}
      {rounded} %
    </span>
  )
}
