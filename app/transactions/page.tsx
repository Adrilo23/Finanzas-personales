import type { Metadata } from 'next'
import { ArrowLeftRightIcon, FileSpreadsheetIcon, FileTextIcon, SearchXIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDayHeading } from '@/lib/format'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Amount } from '@/components/amount'
import { CategoryBadge, TransferBadge } from '@/components/category-type'
import { isHiddenTransferLeg, pairTransferLegs } from '@/lib/transfers'
import { Button } from '@/components/ui/button'
import { NewTransactionDialog } from './new-transaction-dialog'
import { DeleteTransactionButton } from './delete-transaction-button'
import { TransactionFilters } from './transaction-filters'
import { AttachmentDialog } from './attachment-dialog'

export const metadata: Metadata = { title: 'Movimientos' }

type TransactionRow = {
  id: string
  account_id: string
  category_id: string | null
  transfer_id: string | null
  amount_cents: number
  currency: string
  description: string | null
  transaction_date: string
  accounts: { name: string }[] | { name: string } | null
  categories:
    | { name: string; type: string; icon: string | null }[]
    | { name: string; type: string; icon: string | null }
    | null
}

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

type SearchParams = {
  accountId?: string
  categoryId?: string
  from?: string
  to?: string
}

function buildExportQuery(params: SearchParams, format: 'xlsx' | 'pdf') {
  const query = new URLSearchParams()
  if (params.accountId) query.set('accountId', params.accountId)
  if (params.categoryId) query.set('categoryId', params.categoryId)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  query.set('format', format)
  return query.toString()
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select(
      'id, account_id, category_id, transfer_id, amount_cents, currency, description, transaction_date, accounts(name), categories(name, type, icon)'
    )
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (params.accountId) query = query.eq('account_id', params.accountId)
  if (params.categoryId) query = query.eq('category_id', params.categoryId)
  if (params.from) query = query.gte('transaction_date', params.from)
  if (params.to) query = query.lte('transaction_date', params.to)

  const [{ data: transactions }, { data: accounts }, { data: categories }] = await Promise.all([
    query,
    supabase.from('accounts').select('id, name').order('created_at', { ascending: true }),
    supabase.from('categories').select('id, name, type').order('name', { ascending: true }),
  ])

  const filteringByAccount = Boolean(params.accountId)
  // Sin filtro de cuenta, cada traspaso se muestra una vez (su pata de salida).
  const rows = ((transactions ?? []) as TransactionRow[]).filter(
    (t) => !isHiddenTransferLeg(t, filteringByAccount)
  )
  const hasFilters = Boolean(params.accountId || params.categoryId || params.from || params.to)

  // Origen y destino de cada traspaso (la otra pata puede no estar en el resultado).
  const transferIds = [
    ...new Set(rows.map((t) => t.transfer_id).filter((id): id is string => !!id)),
  ]
  const { data: legs } =
    transferIds.length > 0
      ? await supabase
          .from('transactions')
          .select('transfer_id, account_id, amount_cents, accounts(name)')
          .in('transfer_id', transferIds)
          .is('deleted_at', null)
      : { data: [] }
  const transfers = pairTransferLegs(
    (legs ?? []).map((l) => ({ ...l, accountName: first(l.accounts)?.name ?? null }))
  )

  // Un traspaso no es una entrada ni una salida de dinero, salvo mirando una sola cuenta.
  const countsAsFlow = (t: TransactionRow) => filteringByAccount || t.transfer_id === null

  let inflow = 0
  let outflow = 0
  for (const t of rows) {
    if (!countsAsFlow(t)) continue
    if (t.amount_cents >= 0) inflow += t.amount_cents
    else outflow += t.amount_cents
  }

  // Agrupa por día manteniendo el orden descendente de la consulta.
  const groups: { date: string; items: TransactionRow[]; total: number }[] = []
  for (const t of rows) {
    const last = groups[groups.length - 1]
    const flow = countsAsFlow(t) ? t.amount_cents : 0
    if (last && last.date === t.transaction_date) {
      last.items.push(t)
      last.total += flow
    } else {
      groups.push({ date: t.transaction_date, items: [t], total: flow })
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Movimientos"
        description={
          rows.length === 1 ? '1 movimiento' : `${rows.length.toLocaleString('es-ES')} movimientos`
        }
        actions={<NewTransactionDialog accounts={accounts ?? []} categories={categories ?? []} />}
      />

      <div className="space-y-3">
        <TransactionFilters
          accounts={accounts ?? []}
          categories={categories ?? []}
          current={params}
          hasFilters={hasFilters}
        />

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex items-baseline gap-2">
                <dt className="text-muted-foreground">Entradas</dt>
                <dd>
                  <Amount cents={inflow} className="font-medium text-positive" />
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-muted-foreground">Salidas</dt>
                <dd>
                  <Amount cents={outflow} className="font-medium" />
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-muted-foreground">Neto</dt>
                <dd>
                  <Amount cents={inflow + outflow} signed className="font-semibold" />
                </dd>
              </div>
            </dl>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={`/transactions/export?${buildExportQuery(params, 'xlsx')}`}>
                  <FileSpreadsheetIcon data-icon="inline-start" />
                  Excel
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/transactions/export?${buildExportQuery(params, 'pdf')}`}>
                  <FileTextIcon data-icon="inline-start" />
                  PDF
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchXIcon}
            title="Ningún movimiento coincide"
            description="Prueba a ampliar el rango de fechas o a quitar algún filtro."
          />
        ) : (
          <EmptyState
            icon={ArrowLeftRightIcon}
            title="Aún no hay movimientos"
            description="Registra tu primer ingreso, gasto o traspaso y aparecerá aquí, agrupado por día."
            action={
              <NewTransactionDialog accounts={accounts ?? []} categories={categories ?? []} />
            }
          />
        )
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.date} aria-labelledby={`dia-${group.date}`}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2
                  id={`dia-${group.date}`}
                  className="text-[0.8125rem] font-medium text-muted-foreground first-letter:uppercase"
                >
                  {formatDayHeading(group.date)}
                </h2>
                <Amount cents={group.total} signed className="text-xs text-muted-foreground" />
              </div>
              <ul className="surface divide-y divide-border/70 overflow-hidden">
                {group.items.map((t) => {
                  const account = first(t.accounts)
                  const category = first(t.categories)
                  const transfer = t.transfer_id ? transfers.get(t.transfer_id) : undefined
                  if (t.transfer_id) {
                    const title = t.description || 'Traspaso'
                    return (
                      <li
                        key={t.id}
                        className="flex items-center gap-1 pr-2 transition-colors duration-150 hover:bg-muted/40"
                      >
                        <NewTransactionDialog
                          accounts={accounts ?? []}
                          categories={categories ?? []}
                          transfer={
                            transfer?.fromAccountId && transfer.toAccountId
                              ? {
                                  transferId: t.transfer_id,
                                  fromAccountId: transfer.fromAccountId,
                                  toAccountId: transfer.toAccountId,
                                  amountCents: transfer.amountCents,
                                  description: t.description,
                                  transactionDate: t.transaction_date,
                                }
                              : undefined
                          }
                          trigger={
                            <button
                              type="button"
                              aria-label={`Editar traspaso ${title}`}
                              disabled={!transfer?.fromAccountId || !transfer.toAccountId}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-3.5 text-left outline-none focus-visible:bg-muted/60 disabled:cursor-default sm:pl-4"
                            >
                              <TransferBadge />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[0.9375rem] font-medium">{title}</p>
                                <p className="truncate text-[0.8125rem] text-muted-foreground">
                                  {transfer?.fromName ?? 'Cuenta eliminada'} →{' '}
                                  {transfer?.toName ?? 'Cuenta eliminada'}
                                </p>
                              </div>
                              <Amount
                                cents={
                                  filteringByAccount ? t.amount_cents : Math.abs(t.amount_cents)
                                }
                                currency={t.currency}
                                signed={filteringByAccount}
                                className="text-[0.9375rem] font-semibold"
                              />
                            </button>
                          }
                        />
                        <div className="flex items-center">
                          <AttachmentDialog transactionId={t.id} />
                          <DeleteTransactionButton id={t.id} isTransfer />
                        </div>
                      </li>
                    )
                  }
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-1 pr-2 transition-colors duration-150 hover:bg-muted/40"
                    >
                      {/* Toda la fila abre la edición; adjuntos y borrar quedan aparte. */}
                      <NewTransactionDialog
                        accounts={accounts ?? []}
                        categories={categories ?? []}
                        transaction={{
                          id: t.id,
                          accountId: t.account_id,
                          categoryId: t.category_id,
                          categoryType: category?.type ?? null,
                          amountCents: t.amount_cents,
                          description: t.description,
                          transactionDate: t.transaction_date,
                        }}
                        trigger={
                          <button
                            type="button"
                            aria-label={`Editar ${t.description || category?.name || 'movimiento'}`}
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-3.5 text-left outline-none focus-visible:bg-muted/60 sm:pl-4"
                          >
                            <CategoryBadge type={category?.type} emoji={category?.icon} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[0.9375rem] font-medium">
                                {t.description || category?.name || 'Sin descripción'}
                              </p>
                              <p className="truncate text-[0.8125rem] text-muted-foreground">
                                {[t.description ? category?.name : null, account?.name]
                                  .filter(Boolean)
                                  .join(' · ') || 'Sin categoría'}
                              </p>
                            </div>
                            <Amount
                              cents={t.amount_cents}
                              currency={t.currency}
                              signed
                              className="text-[0.9375rem] font-semibold"
                            />
                          </button>
                        }
                      />
                      <div className="flex items-center">
                        <AttachmentDialog transactionId={t.id} />
                        <DeleteTransactionButton id={t.id} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  )
}
