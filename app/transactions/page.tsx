import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/money'
import { NewTransactionDialog } from './new-transaction-dialog'
import { DeleteTransactionButton } from './delete-transaction-button'

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

export default async function TransactionsPage() {
  const supabase = await createClient()

  const [{ data: transactions }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        'id, amount_cents, currency, description, transaction_date, accounts(name), categories(name, type)'
      )
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
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

      {rows.length === 0 ? (
        <p className="text-muted-foreground">Todavía no tienes ningún movimiento registrado.</p>
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
