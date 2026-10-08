import type { Metadata } from 'next'
import { PencilIcon, TargetIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { computeGoals } from '@/lib/goals'
import { formatShortDate } from '@/lib/format'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Amount } from '@/components/amount'
import { BudgetBar } from '@/components/budget-progress'
import { GoalStatusBadge, goalBarStatus } from '@/components/goal-status'
import { Button } from '@/components/ui/button'
import { GoalDialog } from './goal-dialog'
import { ContributionDialog } from './contribution-dialog'
import { DeleteContributionButton, DeleteGoalButton } from './delete-buttons'

export const metadata: Metadata = { title: 'Objetivos' }

export default async function GoalsPage() {
  const supabase = await createClient()
  const now = new Date()

  const [{ data: goalRows }, { data: contributionRows }] = await Promise.all([
    supabase
      .from('savings_goals')
      .select('id, name, icon, target_cents, target_date')
      .order('created_at', { ascending: true }),
    supabase
      .from('goal_contributions')
      .select('id, goal_id, amount_cents, contribution_date, note')
      .order('contribution_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const contributions = contributionRows ?? []
  const goals = computeGoals(goalRows ?? [], contributions, now)

  // Primero los que siguen en marcha; los cumplidos al final.
  const sorted = [...goals].sort(
    (a, b) => Number(a.status === 'completed') - Number(b.status === 'completed')
  )

  const newDialog = <GoalDialog />

  return (
    <PageShell>
      <PageHeader
        title="Objetivos"
        description="Metas de ahorro con su progreso. Tú registras las aportaciones."
        actions={goals.length > 0 ? newDialog : undefined}
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={TargetIcon}
          title="Aún no tienes objetivos"
          description="Crea una meta (un viaje, un fondo de emergencia…), ve anotando lo que apartas y comprueba si llegas a tiempo."
          action={newDialog}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sorted.map((g) => {
            const history = contributions.filter((c) => c.goal_id === g.id)
            return (
              <li key={g.id} className="surface flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-lg"
                  >
                    {g.icon || '🎯'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{g.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <GoalStatusBadge status={g.status} />
                      {g.targetDate && (
                        <span className="text-xs text-muted-foreground">
                          para el {formatShortDate(g.targetDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="-mt-1 -mr-1 flex">
                    <GoalDialog
                      initial={{
                        id: g.id,
                        name: g.name,
                        icon: g.icon,
                        targetCents: g.targetCents,
                        targetDate: g.targetDate,
                      }}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar objetivo ${g.name}`}
                          className="text-muted-foreground"
                        >
                          <PencilIcon />
                        </Button>
                      }
                    />
                    <DeleteGoalButton id={g.id} name={g.name} />
                  </div>
                </div>

                <div>
                  <p className="mb-2 flex items-baseline justify-between gap-3">
                    <span>
                      <Amount
                        cents={g.savedCents}
                        className="text-xl font-semibold tracking-[-0.02em]"
                      />
                      <span className="text-sm text-muted-foreground">
                        {' '}
                        de <Amount cents={g.targetCents} />
                      </span>
                    </span>
                    <span className="num text-sm text-muted-foreground">
                      {Math.round(g.ratio * 100)} %
                    </span>
                  </p>
                  <BudgetBar ratio={g.ratio} status={goalBarStatus(g.status)} />
                  <p className="mt-2 text-[0.8125rem] text-muted-foreground">
                    {g.status === 'completed' ? (
                      '¡Objetivo conseguido!'
                    ) : (
                      <>
                        Faltan <Amount cents={g.remainingCents} className="font-medium text-foreground" />
                        {g.requiredPerMonthCents !== null && (
                          <>
                            {' '}
                            · necesitas <Amount cents={g.requiredPerMonthCents} />
                            /mes
                          </>
                        )}
                      </>
                    )}
                  </p>
                  {g.status !== 'completed' && (
                    <p className="mt-1 text-[0.8125rem] text-muted-foreground">
                      {g.paceCents > 0 ? (
                        <>
                          Ahorras <Amount cents={g.paceCents} />
                          /mes
                          {g.projectedDate &&
                            ` · lo alcanzarías en ${format(g.projectedDate, 'MMMM yyyy', { locale: es })}`}
                        </>
                      ) : (
                        'Sin aportaciones en los últimos 3 meses'
                      )}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <ContributionDialog goalId={g.id} name={g.name} />
                </div>

                {history.length > 0 && (
                  <details className="group -mx-1">
                    <summary className="cursor-pointer list-none rounded-lg px-1 py-1 text-[0.8125rem] font-medium text-muted-foreground outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
                      Historial ({history.length})
                    </summary>
                    <ul className="mt-1 divide-y divide-border/60">
                      {history.slice(0, 20).map((c) => (
                        <li key={c.id} className="flex items-center gap-2 px-1 py-1.5 text-sm">
                          <span className="w-16 shrink-0 text-xs text-muted-foreground">
                            {format(parseISO(c.contribution_date), 'd MMM yy', { locale: es })}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">
                            {c.note}
                          </span>
                          <Amount cents={c.amount_cents} signed className="font-medium" />
                          <DeleteContributionButton id={c.id} />
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
