import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRightIcon, PencilIcon, WalletIcon } from 'lucide-react'
import { formatCents } from '@/lib/money'
import { gainPercent } from '@/lib/investments'
import { createClient } from '@/lib/supabase/server'
import { ACCOUNT_TYPE_LABELS, type AccountInput } from '@/lib/validation/account-schemas'
import { Button } from '@/components/ui/button'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Amount } from '@/components/amount'
import { AccountIcon } from '@/components/account-type'
import { NewAccountDialog } from './new-account-dialog'
import { DeleteAccountButton } from './delete-account-button'

export const metadata: Metadata = { title: 'Cuentas' }

function InvestmentGain({ invested, gain }: { invested: number; gain: number }) {
  if (invested === 0) {
    return <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">Sin activos todavía</p>
  }
  const pct = gainPercent(gain, invested)
  return (
    <p
      className={
        'num mt-0.5 text-[0.8125rem] ' +
        (gain > 0 ? 'text-positive' : gain < 0 ? 'text-negative' : 'text-muted-foreground')
      }
    >
      {gain > 0 ? '+' : ''}
      {formatCents(gain)}
      {pct !== null &&
        ` (${pct > 0 ? '+' : ''}${pct.toLocaleString('es-ES', { maximumFractionDigits: 2 })} %)`}
      <span className="text-muted-foreground"> sobre {formatCents(invested)} aportados</span>
    </p>
  )
}

export default async function AccountsPage() {
  const supabase = await createClient()
  // Postgres marca todas las columnas de una vista como anulables en los tipos generados,
  // aunque aquí vienen de columnas NOT NULL de accounts; de ahí los ?? y el ! de abajo.
  const [{ data: accounts }, { data: holdingValues }] = await Promise.all([
    supabase
      .from('account_balances')
      .select('id, name, type, currency, initial_balance_cents, balance_cents')
      .order('created_at', { ascending: true }),
    supabase.from('holding_values').select('account_id, invested_cents, gain_cents'),
  ])

  const list = accounts ?? []
  // Aportado y rentabilidad de cada cuenta de inversión (suma de sus activos).
  const investment = new Map<string, { invested: number; gain: number }>()
  for (const h of holdingValues ?? []) {
    if (!h.account_id) continue
    const acc = investment.get(h.account_id) ?? { invested: 0, gain: 0 }
    acc.invested += h.invested_cents ?? 0
    acc.gain += h.gain_cents ?? 0
    investment.set(h.account_id, acc)
  }
  const total = list.reduce((sum, a) => sum + (a.balance_cents ?? 0), 0)

  return (
    <PageShell>
      <PageHeader
        title="Cuentas"
        description="Saldos con todos los movimientos y, en las de inversión, el valor actual de sus activos."
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
                  <div className="flex">
                    <NewAccountDialog
                      account={{
                        id: account.id!,
                        name: account.name ?? '',
                        type: (account.type ?? 'other') as AccountInput['type'],
                        currency: account.currency ?? 'EUR',
                        initialBalanceCents: account.initial_balance_cents ?? 0,
                      }}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar cuenta ${account.name}`}
                          className="-mt-1 text-muted-foreground"
                        >
                          <PencilIcon />
                        </Button>
                      }
                    />
                    <DeleteAccountButton id={account.id!} name={account.name ?? ''} />
                  </div>
                </div>
                {account.type === 'investment' ? (
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <Amount
                        cents={account.balance_cents ?? 0}
                        className="text-2xl font-semibold tracking-[-0.02em]"
                      />
                      <InvestmentGain
                        {...(investment.get(account.id!) ?? { invested: 0, gain: 0 })}
                      />
                    </div>
                    <Link
                      href={`/accounts/${account.id}`}
                      className="group flex shrink-0 items-center gap-1 rounded text-[0.8125rem] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      Ver activos
                      <ArrowRightIcon
                        aria-hidden
                        className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </div>
                ) : (
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
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  )
}
