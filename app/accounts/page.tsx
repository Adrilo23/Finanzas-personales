import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/money'
import { ACCOUNT_TYPE_LABELS } from '@/lib/validation/account-schemas'
import { NewAccountDialog } from './new-account-dialog'
import { DeleteAccountButton } from './delete-account-button'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: accounts } = await supabase
    .from('account_balances')
    .select('id, name, type, currency, initial_balance_cents, balance_cents')
    .order('created_at', { ascending: true })

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cuentas</h1>
        <NewAccountDialog />
      </div>

      {!accounts || accounts.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no tienes ninguna cuenta. Crea la primera.
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-muted-foreground">
                  {ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS]} ·
                  Saldo inicial: {formatCents(account.initial_balance_cents, account.currency)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">
                  {formatCents(account.balance_cents, account.currency)}
                </span>
                <DeleteAccountButton id={account.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
