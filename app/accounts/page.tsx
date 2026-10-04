import type { Metadata } from 'next'
import { WalletIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ACCOUNT_TYPE_LABELS } from '@/lib/validation/account-schemas'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Amount } from '@/components/amount'
import { AccountIcon } from '@/components/account-type'
import { NewAccountDialog } from './new-account-dialog'
import { DeleteAccountButton } from './delete-account-button'

export const metadata: Metadata = { title: 'Cuentas' }

export default async function AccountsPage() {
  const supabase = await createClient()
  // Postgres marca todas las columnas de una vista como anulables en los tipos generados,
  // aunque aquí vienen de columnas NOT NULL de accounts; de ahí los ?? y el ! de abajo.
  const { data: accounts } = await supabase
    .from('account_balances')
    .select('id, name, type, currency, initial_balance_cents, balance_cents')
    .order('created_at', { ascending: true })

  const list = accounts ?? []
  const total = list.reduce((sum, a) => sum + (a.balance_cents ?? 0), 0)

  return (
    <PageShell>
      <PageHeader
        title="Cuentas"
        description="Saldos calculados con todos los movimientos registrados."
        actions={<NewAccountDialog />}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={WalletIcon}
          title="Crea tu primera cuenta"
          description="Una cuenta bancaria, una tarjeta o el efectivo de la cartera. Cada movimiento se asigna a una cuenta."
          action={<NewAccountDialog />}
        />
      ) : (
        <>
          <section className="surface flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className="text-sm text-muted-foreground">Saldo total</p>
              <Amount
                cents={total}
                className="mt-1 block text-4xl font-semibold tracking-[-0.03em] sm:text-[2.75rem]"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {list.length === 1 ? '1 cuenta' : `${list.length} cuentas`}
            </p>
          </section>

          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((account) => (
              <li key={account.id} className="surface flex flex-col gap-5 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <AccountIcon type={account.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{account.name}</p>
                    <p className="text-[0.8125rem] text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS] ??
                        'Otro'}
                    </p>
                  </div>
                  <DeleteAccountButton id={account.id!} name={account.name ?? ''} />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <Amount
                    cents={account.balance_cents ?? 0}
                    currency={account.currency ?? undefined}
                    className={
                      (account.balance_cents ?? 0) < 0
                        ? 'text-2xl font-semibold tracking-[-0.02em] text-negative'
                        : 'text-2xl font-semibold tracking-[-0.02em]'
                    }
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    Saldo inicial
                    <br />
                    <Amount
                      cents={account.initial_balance_cents ?? 0}
                      currency={account.currency ?? undefined}
                    />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  )
}
