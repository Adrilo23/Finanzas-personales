import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/money'
import { NewTransactionDialog } from './new-transaction-dialog'
import { DeleteTransactionButton } from './delete-transaction-button'
import { TransactionFilters } from './transaction-filters'
import { AttachmentDialog } from './attachment-dialog'

type TransactionRow = {
  id: string
  amount_cents: number
  currency: string
  description: string | null
  transaction_date: string
  accounts: { name: string }[] | { name: string } | null
  categories: { name: string; type: string }[] | { name: string; type: string } | null
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
      'id, amount_cents, currency, description, transaction_date, accounts(name), categories(name, type)'
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

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Movimientos</h1>
        <NewTransactionDialog accounts={accounts ?? []} categories={categories ?? []} />
      </div>

      <TransactionFilters
        accounts={accounts ?? []}
        categories={categories ?? []}
        current={params}
      />

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No hay movimientos que coincidan con el filtro.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map((t) => {
            const account = first(t.accounts)
            const category = first(t.categories)
            return (
              <div key={t.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {t.description || category?.name || 'Sin descripción'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t.transaction_date} · {account?.name} · {category?.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      t.amount_cents >= 0
                        ? 'text-green-600 font-medium'
                        : 'text-red-600 font-medium'
                    }
                  >
                    {formatCents(t.amount_cents, t.currency)}
                  </span>
                  <AttachmentDialog transactionId={t.id} />
                  <DeleteTransactionButton id={t.id} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
