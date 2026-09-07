import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/money'
import { FREQUENCY_LABELS } from '@/lib/validation/recurring-schemas'
import { NewRecurringDialog } from './new-recurring-dialog'
import { RecurringRuleActions } from './recurring-rule-actions'

type RuleRow = {
  id: string
  amount_cents: number
  frequency: string
  next_run_date: string
  active: boolean
  accounts: { name: string }[] | { name: string } | null
  categories: { name: string; type: string }[] | { name: string; type: string } | null
}

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export default async function RecurringPage() {
  const supabase = await createClient()

  const [{ data: rules }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('recurring_rules')
      .select('id, amount_cents, frequency, next_run_date, active, accounts(name), categories(name, type)')
      .order('next_run_date', { ascending: true }),
    supabase.from('accounts').select('id, name').order('created_at', { ascending: true }),
    supabase.from('categories').select('id, name, type').order('name', { ascending: true }),
  ])

  const rows = (rules ?? []) as RuleRow[]

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Movimientos recurrentes</h1>
        <NewRecurringDialog accounts={accounts ?? []} categories={categories ?? []} />
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">Todavía no tienes ninguna regla recurrente.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map((rule) => {
            const account = first(rule.accounts)
            const category = first(rule.categories)
            return (
              <div key={rule.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {category?.name} · {account?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {FREQUENCY_LABELS[rule.frequency as keyof typeof FREQUENCY_LABELS]} ·
                    Próxima: {rule.next_run_date} · {formatCents(rule.amount_cents)}
                    {!rule.active && ' · Pausada'}
                  </p>
                </div>
                <RecurringRuleActions id={rule.id} active={rule.active} />
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
