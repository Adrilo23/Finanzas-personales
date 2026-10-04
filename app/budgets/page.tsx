import type { Metadata } from 'next'
import { differenceInCalendarDays, endOfMonth } from 'date-fns'
import { PencilIcon, PiggyBankIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getBudgetProgress } from '@/lib/budgets'
import { formatMonthYear } from '@/lib/format'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Amount } from '@/components/amount'
import { CategoryBadge } from '@/components/category-type'
import { BudgetBar, BudgetStatusBadge } from '@/components/budget-progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BudgetDialog } from './budget-dialog'
import { DeleteBudgetButton } from './delete-budget-button'

export const metadata: Metadata = { title: 'Presupuestos' }

export default async function BudgetsPage() {
  const supabase = await createClient()
  const now = new Date()

  const [budgets, { data: categoryRows }] = await Promise.all([
    getBudgetProgress(now),
    supabase
      .from('categories')
      .select('id, name, parent_id')
      .eq('type', 'expense')
      .order('name', { ascending: true }),
  ])

  const categories = categoryRows ?? []
  const budgetsByCategory = Object.fromEntries(budgets.map((b) => [b.categoryId, b.budgetCents]))

  const totalBudget = budgets.reduce((sum, b) => sum + b.budgetCents, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spentCents, 0)
  const remaining = totalBudget - totalSpent
  const daysLeft = differenceInCalendarDays(endOfMonth(now), now) + 1
  const overCount = budgets.filter((b) => b.status === 'over').length

  // Primero lo que necesita atención: superados, luego cerca del límite, luego por % gastado.
  const order = { over: 0, warning: 1, ok: 2 } as const
  const sorted = [...budgets].sort((a, b) => order[a.status] - order[b.status] || b.ratio - a.ratio)

  const newDialog = <BudgetDialog categories={categories} budgetsByCategory={budgetsByCategory} />

  return (
    <PageShell>
      <PageHeader
        title="Presupuestos"
        description="Límites mensuales por categoría de gasto. Se reinician cada mes."
        actions={budgets.length > 0 ? newDialog : undefined}
      />

      {budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBankIcon}
          title="Aún no tienes presupuestos"
          description="Pon un límite mensual a las categorías donde más gastas y te avisaremos al acercarte al 80 % y al pasarte."
          action={newDialog}
        />
      ) : (
        <>
          <section
            aria-label="Resumen del mes"
            className="surface grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-6"
          >
            <div>
              <p className="text-sm text-muted-foreground first-letter:uppercase">
                {formatMonthYear(now)} · {daysLeft === 1 ? 'último día' : `quedan ${daysLeft} días`}
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <Amount
                  cents={Math.abs(remaining)}
                  className={cn(
                    'text-4xl font-semibold tracking-[-0.03em]',
                    remaining < 0 && 'text-negative'
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  {remaining >= 0 ? 'disponibles' : 'por encima del total'}
                </span>
              </p>
              <BudgetBar
                className="mt-4 max-w-md"
                ratio={totalBudget > 0 ? totalSpent / totalBudget : 0}
                status={remaining < 0 ? 'over' : totalSpent / totalBudget >= 0.8 ? 'warning' : 'ok'}
              />
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
              <dt className="text-muted-foreground">Gastado</dt>
              <dd>
                <Amount cents={totalSpent} className="font-medium" />
              </dd>
              <dt className="text-muted-foreground">Presupuestado</dt>
              <dd>
                <Amount cents={totalBudget} className="font-medium" />
              </dd>
              {overCount > 0 && (
                <>
                  <dt className="text-muted-foreground">Superados</dt>
                  <dd className="num font-medium text-negative">
                    {overCount} de {budgets.length}
                  </dd>
                </>
              )}
            </dl>
          </section>

          <ul className="grid gap-3 sm:grid-cols-2">
            {sorted.map((b) => {
              const left = b.budgetCents - b.spentCents
              return (
                <li key={b.id} className="surface flex flex-col gap-4 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <CategoryBadge type="expense" emoji={b.icon} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{b.name}</p>
                      <BudgetStatusBadge status={b.status} className="mt-1" />
                    </div>
                    <div className="-mt-1 -mr-1 flex">
                      <BudgetDialog
                        categories={categories}
                        budgetsByCategory={budgetsByCategory}
                        initial={{
                          categoryId: b.categoryId,
                          amountCents: b.budgetCents,
                          name: b.name,
                        }}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar presupuesto de ${b.name}`}
                            className="text-muted-foreground"
                          >
                            <PencilIcon />
                          </Button>
                        }
                      />
                      <DeleteBudgetButton id={b.id} name={b.name} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 flex items-baseline justify-between gap-3">
                      <span>
                        <Amount
                          cents={b.spentCents}
                          className="text-xl font-semibold tracking-[-0.02em]"
                        />
                        <span className="text-sm text-muted-foreground">
                          {' '}
                          de <Amount cents={b.budgetCents} />
                        </span>
                      </span>
                      <span className="num text-sm text-muted-foreground">
                        {Math.round(b.ratio * 100)} %
                      </span>
                    </p>
                    <BudgetBar ratio={b.ratio} status={b.status} />
                    <p
                      className={cn(
                        'mt-2 text-[0.8125rem]',
                        left < 0 ? 'font-medium text-negative' : 'text-muted-foreground'
                      )}
                    >
                      {left < 0 ? (
                        <>
                          Te has pasado <Amount cents={-left} />
                        </>
                      ) : left === 0 ? (
                        'Has llegado justo al límite'
                      ) : (
                        <>
                          Te quedan <Amount cents={left} className="font-medium text-foreground" />
                        </>
                      )}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </PageShell>
  )
}
