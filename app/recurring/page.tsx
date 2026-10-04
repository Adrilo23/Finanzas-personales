import type { Metadata } from 'next'
import { RepeatIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { FREQUENCY_LABELS } from '@/lib/validation/recurring-schemas'
import { formatShortDate } from '@/lib/format'
import { applyCategorySign, formatCents } from '@/lib/money'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Amount } from '@/components/amount'
import { CategoryBadge, TransferBadge } from '@/components/category-type'
import { cn } from '@/lib/utils'
import { NewRecurringDialog } from './new-recurring-dialog'
import { RecurringRuleActions } from './recurring-rule-actions'

export const metadata: Metadata = { title: 'Recurrentes' }

type RuleRow = {
  id: string
  amount_cents: number
  frequency: string
  next_run_date: string
  active: boolean
  to_account_id: string | null
  account: { name: string }[] | { name: string } | null
  to_account: { name: string }[] | { name: string } | null
  categories:
    | { name: string; type: string; icon: string | null }[]
    | { name: string; type: string; icon: string | null }
    | null
}

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export default async function RecurringPage() {
  const supabase = await createClient()

  const [
    { data: rules },
    { data: accounts },
    { data: categories },
    { data: holdingRows },
    { data: allocationRows },
  ] = await Promise.all([
    supabase
      .from('recurring_rules')
      .select(
        // Dos relaciones con accounts (origen y destino de traspasos): hay que nombrarlas.
        'id, amount_cents, frequency, next_run_date, active, to_account_id, account:accounts!recurring_rules_account_id_fkey(name), to_account:accounts!recurring_rules_to_account_id_fkey(name), categories(name, type, icon)'
      )
      .order('next_run_date', { ascending: true }),
    supabase.from('accounts').select('id, name, type').order('created_at', { ascending: true }),
    supabase.from('categories').select('id, name, type').order('name', { ascending: true }),
    supabase.from('holdings').select('id, name, account_id').order('name', { ascending: true }),
    supabase
      .from('recurring_allocations')
      .select('rule_id, amount_cents, holdings(name)')
      .order('amount_cents', { ascending: false }),
  ])

  const accountName = new Map((accounts ?? []).map((a) => [a.id, a.name]))
  const holdings = (holdingRows ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    accountId: h.account_id,
    accountName: accountName.get(h.account_id) ?? '',
  }))
  const allocationsByRule = new Map<string, { name: string; cents: number }[]>()
  for (const a of allocationRows ?? []) {
    const list = allocationsByRule.get(a.rule_id) ?? []
    list.push({ name: first(a.holdings)?.name ?? 'Activo', cents: a.amount_cents })
    allocationsByRule.set(a.rule_id, list)
  }

  const rows = (rules ?? []) as unknown as RuleRow[]
  const activeCount = rows.filter((r) => r.active).length

  return (
    <PageShell>
      <PageHeader
        title="Recurrentes"
        description="Nóminas, alquileres, suscripciones o traspasos que se registran solos en su fecha."
        actions={
          <NewRecurringDialog
            accounts={accounts ?? []}
            categories={categories ?? []}
            holdings={holdings}
          />
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={RepeatIcon}
          title="Sin movimientos recurrentes"
          description="Crea una regla y cada vez que venza se añadirá el movimiento automáticamente."
          action={
            <NewRecurringDialog
              accounts={accounts ?? []}
              categories={categories ?? []}
              holdings={holdings}
            />
          }
        />
      ) : (
        <section aria-label="Reglas recurrentes">
          <p className="mb-2 px-1 text-[0.8125rem] text-muted-foreground">
            {activeCount === rows.length
              ? `${rows.length} ${rows.length === 1 ? 'regla activa' : 'reglas activas'}`
              : `${activeCount} de ${rows.length} activas`}
          </p>
          <ul className="surface divide-y divide-border/70 overflow-hidden">
            {rows.map((rule) => {
              const account = first(rule.account)
              const toAccount = first(rule.to_account)
              const category = first(rule.categories)
              const isTransfer = rule.to_account_id !== null
              const allocations = allocationsByRule.get(rule.id) ?? []
              return (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 pr-3 pl-3.5 sm:flex-nowrap sm:pl-4"
                >
                  <div
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-3 transition-opacity',
                      !rule.active && 'opacity-55'
                    )}
                  >
                    {isTransfer ? (
                      <TransferBadge />
                    ) : (
                      <CategoryBadge type={category?.type} emoji={category?.icon} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-[0.9375rem] font-medium">
                        <span className="truncate">
                          {isTransfer
                            ? allocations.length > 0
                              ? 'Plan de aportación'
                              : 'Traspaso'
                            : (category?.name ?? 'Sin categoría')}
                        </span>
                        {!rule.active && (
                          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                            Pausada
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[0.8125rem] text-muted-foreground">
                        {FREQUENCY_LABELS[rule.frequency as keyof typeof FREQUENCY_LABELS]} ·{' '}
                        {isTransfer
                          ? `${account?.name ?? '—'} → ${toAccount?.name ?? '—'}`
                          : account?.name}{' '}
                        · próxima el {formatShortDate(rule.next_run_date)}
                      </p>
                      {allocations.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          Reparto:{' '}
                          {allocations.map((a) => `${a.name} ${formatCents(a.cents)}`).join(' · ')}
                        </p>
                      )}
                    </div>
                    {isTransfer ? (
                      <Amount
                        cents={rule.amount_cents}
                        className="text-[0.9375rem] font-semibold"
                      />
                    ) : (
                      <Amount
                        // Las reglas guardan el importe en positivo; el signo sale del tipo.
                        cents={applyCategorySign(rule.amount_cents, category?.type)}
                        signed
                        className="text-[0.9375rem] font-semibold"
                      />
                    )}
                  </div>
                  <RecurringRuleActions id={rule.id} active={rule.active} />
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </PageShell>
  )
}
