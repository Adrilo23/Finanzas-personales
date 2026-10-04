import type { Metadata } from 'next'
import { ArrowLeftRightIcon, FileSpreadsheetIcon, FileTextIcon, SearchXIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDayHeading } from '@/lib/format'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Amount } from '@/components/amount'
import { CategoryBadge } from '@/components/category-type'
import { Button } from '@/components/ui/button'
import { NewTransactionDialog } from './new-transaction-dialog'
import { DeleteTransactionButton } from './delete-transaction-button'
import { TransactionFilters } from './transaction-filters'
import { AttachmentDialog } from './attachment-dialog'

export const metadata: Metadata = { title: 'Movimientos' }

type TransactionRow = {
  id: string
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
      'id, amount_cents, currency, description, transaction_date, accounts(name), categories(name, type, icon)'
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

  const rows = (transactions ?? []) as TransactionRow[]
  const hasFilters = Boolean(params.accountId || params.categoryId || params.from || params.to)

  let inflow = 0
  let outflow = 0
  for (const t of rows) {
    if (t.amount_cents >= 0) inflow += t.amount_cents
    else outflow += t.amount_cents
  }

  // Agrupa por día manteniendo el orden descendente de la consulta.
  const groups: { date: string; items: TransactionRow[]; total: number }[] = []
  for (const t of rows) {
    const last = groups[groups.length - 1]
    if (last && last.date === t.transaction_date) {
      last.items.push(t)
      last.total += t.amount_cents
    } else {
      groups.push({ date: t.transaction_date, items: [t], total: t.amount_cents })
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
            description="Registra tu primer ingreso o gasto y aparecerá aquí, agrupado por día."
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
                  return (
                    <li
                      key={t.id}
                      className="group flex items-center gap-3 py-3 pr-2 pl-3.5 transition-colors duration-150 hover:bg-muted/40 sm:pl-4"
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
