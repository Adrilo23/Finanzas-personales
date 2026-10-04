import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon, BitcoinIcon, ChartLineIcon, PlusIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCents, formatPrice, formatUnits } from '@/lib/money'
import { gainPercent } from '@/lib/investments'
import { formatShortDate } from '@/lib/format'
import { OPERATION_KIND_LABELS } from '@/lib/validation/investment-schemas'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Amount } from '@/components/amount'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AddHoldingDialog } from './add-holding-dialog'
import { OperationDialog } from './operation-dialog'
import { DeleteHoldingButton, DeleteOperationButton } from './delete-buttons'

export const metadata: Metadata = { title: 'Cuenta de inversión' }

function Gain({
  cents,
  invested,
  className,
}: {
  cents: number
  invested: number
  className?: string
}) {
  const pct = gainPercent(cents, invested)
  return (
    <span
      className={cn(
        'num whitespace-nowrap',
        cents > 0 ? 'text-positive' : cents < 0 ? 'text-negative' : 'text-muted-foreground',
        className
      )}
    >
      {cents > 0 ? '+' : ''}
      {formatCents(cents)}
      {pct !== null && (
        <span className="ml-1 opacity-80">
          ({pct > 0 ? '+' : ''}
          {pct.toLocaleString('es-ES', { maximumFractionDigits: 2 })} %)
        </span>
      )}
    </span>
  )
}

export default async function InvestmentAccountPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: account } = await supabase
    .from('account_balances')
    .select('id, name, type, balance_cents, market_value_cents')
    .eq('id', id)
    .maybeSingle()

  if (!account || account.type !== 'investment') notFound()

  const { data: holdingRows } = await supabase
    .from('holding_values')
    .select('*')
    .eq('account_id', id)
    .order('name', { ascending: true })

  const holdings = (holdingRows ?? []).filter((h): h is typeof h & { id: string } => Boolean(h.id))
  const { data: operations } =
    holdings.length > 0
      ? await supabase
          .from('holding_operations')
          .select('id, holding_id, operation_date, kind, units, amount_cents')
          .in(
            'holding_id',
            holdings.map((h) => h.id)
          )
          .order('operation_date', { ascending: false })
          .order('created_at', { ascending: false })
      : { data: [] }

  const totalValue = holdings.reduce((sum, h) => sum + (h.value_cents ?? 0), 0)
  const totalInvested = holdings.reduce((sum, h) => sum + (h.invested_cents ?? 0), 0)
  const totalGain = totalValue - totalInvested
  const priceDates = holdings.map((h) => h.price_date).filter((d): d is string => Boolean(d))
  const oldestPriceDate = priceDates.sort()[0]

  return (
    <PageShell>
      <div className="space-y-4">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          Cuentas
        </Link>
        <PageHeader
          title={account.name}
          description="Cuenta de inversión"
          actions={holdings.length > 0 ? <AddHoldingDialog accountId={id} /> : undefined}
        />
      </div>

      {holdings.length === 0 ? (
        <EmptyState
          icon={ChartLineIcon}
          title="Añade los fondos de esta cuenta"
          description="Por cada fondo (por su ISIN) o criptomoneda registra tus compras con las participaciones de tu bróker. Calcularemos su valor cada día y tu rentabilidad."
          action={<AddHoldingDialog accountId={id} />}
        />
      ) : (
        <>
          <section
            aria-label="Resumen de la cuenta"
            className="surface grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-6"
          >
            <div>
              <p className="text-sm text-muted-foreground">Valor actual</p>
              <Amount
                cents={totalValue}
                className="mt-1 block text-4xl font-semibold tracking-[-0.03em] sm:text-[2.75rem]"
              />
              {oldestPriceDate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Precios del {formatShortDate(oldestPriceDate)} (los fondos publican su valor con
                  un día de retraso)
                </p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
              <dt className="text-muted-foreground">Aportado</dt>
              <dd>
                <Amount cents={totalInvested} className="font-medium" />
              </dd>
              <dt className="text-muted-foreground">Rentabilidad</dt>
              <dd>
                <Gain cents={totalGain} invested={totalInvested} className="font-medium" />
              </dd>
            </dl>
          </section>

          <ul className="space-y-3">
            {holdings.map((h) => {
              const ops = (operations ?? []).filter((o) => o.holding_id === h.id)
              const isCrypto = h.asset_type === 'crypto'
              const Icon = isCrypto ? BitcoinIcon : ChartLineIcon
              const units = Number(h.units ?? 0)
              return (
                <li key={h.id} className="surface overflow-hidden">
                  <div className="flex items-start gap-3 p-4 sm:p-5">
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-invest-soft text-invest"
                    >
                      <Icon className="size-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{h.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {isCrypto ? h.symbol : h.isin}
                      </p>
                    </div>
                    <div className="text-right">
                      <Amount
                        cents={h.value_cents ?? 0}
                        className="block text-lg font-semibold tracking-[-0.02em]"
                      />
                      <Gain
                        cents={h.gain_cents ?? 0}
                        invested={h.invested_cents ?? 0}
                        className="text-[0.8125rem]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 px-4 py-2.5 sm:px-5">
                    <p className="text-[0.8125rem] text-muted-foreground">
                      <span className="num text-foreground">{formatUnits(units)}</span>{' '}
                      {isCrypto ? 'unidades' : units === 1 ? 'participación' : 'participaciones'}
                      {h.price != null && (
                        <>
                          {' · '}
                          <span className="num">{formatPrice(Number(h.price))}</span>
                          {h.price_date && ` el ${formatShortDate(h.price_date)}`}
                        </>
                      )}
                      {h.price == null && ' · sin precio todavía'}
                    </p>
                    <div className="flex items-center gap-1">
                      <OperationDialog
                        holdingId={h.id}
                        holdingName={h.name ?? ''}
                        isCrypto={isCrypto}
                        trigger={
                          <Button variant="outline" size="sm">
                            <PlusIcon data-icon="inline-start" />
                            Operación
                          </Button>
                        }
                      />
                      <DeleteHoldingButton id={h.id} accountId={id} name={h.name ?? ''} />
                    </div>
                  </div>

                  {ops.length > 0 && (
                    <details className="group border-t border-border/70">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-[0.8125rem] font-medium text-muted-foreground outline-none select-none hover:bg-muted/40 hover:text-foreground focus-visible:bg-muted/60 sm:px-5 [&::-webkit-details-marker]:hidden">
                        {ops.length === 1 ? '1 operación' : `${ops.length} operaciones`}
                        <span
                          aria-hidden
                          className="transition-transform duration-200 group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <ul className="divide-y divide-border/60 border-t border-border/60">
                        {ops.map((o) => (
                          <li
                            key={o.id}
                            className="flex items-center gap-3 py-2 pr-3 pl-4 text-[0.8125rem] sm:pl-5"
                          >
                            <span className="w-24 shrink-0 text-muted-foreground">
                              {formatShortDate(o.operation_date)}
                            </span>
                            <span
                              className={cn(
                                'shrink-0 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium',
                                o.kind === 'buy'
                                  ? 'bg-invest-soft text-invest'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {OPERATION_KIND_LABELS[o.kind as 'buy' | 'sell']}
                            </span>
                            <span className="num min-w-0 flex-1 truncate text-muted-foreground">
                              {formatUnits(Number(o.units))}
                            </span>
                            <Amount cents={o.amount_cents} className="font-medium" />
                            <DeleteOperationButton id={o.id} accountId={id} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </PageShell>
  )
}
