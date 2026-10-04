import Link from 'next/link'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRightIcon, CheckIcon, ClockIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDayHeading, formatMonthYear } from '@/lib/format'
import { PageHeader, PageShell } from '@/components/page-header'
import { Amount } from '@/components/amount'
import { AccountIcon } from '@/components/account-type'
import { CategoryBadge, TransferBadge } from '@/components/category-type'
import { isHiddenTransferLeg } from '@/lib/transfers'
import { BudgetBar, BudgetStatusBadge } from '@/components/budget-progress'
import { getBudgetProgress } from '@/lib/budgets'
import { NewAccountDialog } from '@/app/accounts/new-account-dialog'
import { NewTransactionDialog } from '@/app/transactions/new-transaction-dialog'
import { cn } from '@/lib/utils'
import { percentChange, sumByType } from '@/lib/stats'

type CategoryRef = { name: string; type: string; icon: string | null }

type MonthRow = {
  amount_cents: number
  transaction_date: string
  categories: CategoryRef[] | CategoryRef | null
}

type RecentRow = {
  id: string
  amount_cents: number
  currency: string
  description: string | null
  transaction_date: string
  transfer_id: string | null
  accounts: { name: string }[] | { name: string } | null
  categories: CategoryRef[] | CategoryRef | null
}

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // proxy.ts ya debería haber redirigido antes de llegar aquí; esto es solo un cinturón de seguridad.
    return null
  }

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const prevStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const [
    { data: monthData },
    { data: balances },
    { data: recentData },
    { data: categories },
    budgets,
    { data: pendingOps },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount_cents, transaction_date, categories(name, type, icon)')
      .is('deleted_at', null)
      .gte('transaction_date', prevStart)
      .lte('transaction_date', monthEnd),
    supabase
      .from('account_balances')
      .select('id, name, type, currency, balance_cents')
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select(
        'id, amount_cents, currency, description, transaction_date, transfer_id, accounts(name), categories(name, type, icon)'
      )
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('categories').select('id, name, type').order('name', { ascending: true }),
    getBudgetProgress(now),
    supabase.from('holding_operations').select('id, holdings(account_id)').eq('status', 'pending'),
  ])

  const rows = (monthData ?? []) as MonthRow[]
  const currentRows = rows.filter((r) => r.transaction_date >= monthStart)
  const previousRows = rows.filter((r) => r.transaction_date < monthStart)
  const current = sumByType(currentRows)
  const previous = sumByType(previousRows)
  const balance = current.income - current.expense - current.investment

  const accounts = (balances ?? []).filter((a): a is typeof a & { id: string; name: string } =>
    Boolean(a.id && a.name)
  )
  const netWorth = accounts.reduce((sum, a) => sum + (a.balance_cents ?? 0), 0)
  // Cada traspaso una sola vez (su pata de salida).
  const recent = ((recentData ?? []) as RecentRow[])
    .filter((t) => !isHiddenTransferLeg(t, false))
    .slice(0, 6)
  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }))
  const categoryOptions = categories ?? []

  // Gasto del mes por categoría (top 5 + resto).
  const byCategory = new Map<string, { name: string; icon: string | null; cents: number }>()
  for (const row of currentRows) {
    const category = first(row.categories)
    if (category?.type !== 'expense') continue
    const entry = byCategory.get(category.name) ?? {
      name: category.name,
      icon: category.icon,
      cents: 0,
    }
    entry.cents += Math.abs(row.amount_cents)
    byCategory.set(category.name, entry)
  }
  const sortedCategories = [...byCategory.values()].sort((a, b) => b.cents - a.cents)
  const topCategories = sortedCategories.slice(0, 5)
  const restCents = sortedCategories.slice(5).reduce((sum, c) => sum + c.cents, 0)
  const maxCategory = topCategories[0]?.cents ?? 0

  // Reparto de los ingresos del mes: gastado / invertido / disponible.
  const outflow = current.expense + current.investment
  const base = Math.max(current.income, outflow)
  const allocation =
    base > 0
      ? [
          { key: 'expense', label: 'Gastado', cents: current.expense, color: 'bg-chart-3' },
          { key: 'investment', label: 'Invertido', cents: current.investment, color: 'bg-chart-2' },
          { key: 'free', label: 'Disponible', cents: Math.max(balance, 0), color: 'bg-chart-1' },
        ].filter((s) => s.cents > 0)
      : []

  // Presupuestos: primero los que necesitan atención.
  const budgetOrder = { over: 0, warning: 1, ok: 2 } as const
  const budgetHighlights = [...budgets]
    .sort((a, b) => budgetOrder[a.status] - budgetOrder[b.status] || b.ratio - a.ratio)
    .slice(0, 4)
  const budgetAlerts = budgets.filter((b) => b.status !== 'ok').length

  // Compras de planes de aportación pendientes de confirmar con el bróker.
  const pendingCount = pendingOps?.length ?? 0
  const pendingAccountId = first(pendingOps?.[0]?.holdings ?? null)?.account_id

  const prevMonthShort = format(subMonths(now, 1), 'MMM', { locale: es }).replace('.', '')

  const stats = [
    {
      label: 'Ingresos',
      cents: current.income,
      change: percentChange(current.income, previous.income),
      upIsGood: true,
      dot: 'bg-chart-1',
    },
    {
      label: 'Gastos',
      cents: current.expense,
      change: percentChange(current.expense, previous.expense),
      upIsGood: false,
      dot: 'bg-chart-3',
    },
    {
      label: 'Inversión',
      cents: current.investment,
      change: percentChange(current.investment, previous.investment),
      upIsGood: true,
      dot: 'bg-chart-2',
    },
  ]

  if (accounts.length === 0) {
    return (
      <PageShell>
        <PageHeader
          title="Te damos la bienvenida"
          description="Tres pasos y tendrás tus finanzas a la vista."
        />
        <ol className="surface divide-y divide-border/70">
          {[
            {
              title: 'Crea una cuenta',
              text: 'Tu cuenta bancaria, una tarjeta o el efectivo, con su saldo actual.',
              action: <NewAccountDialog />,
            },
            {
              title: 'Revisa tus categorías',
              text: 'Ya tienes unas cuantas creadas; ajústalas a tu forma de gastar.',
              action: (
                <Link
                  href="/categories"
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  Ver categorías
                </Link>
              ),
            },
            {
              title: 'Registra tu primer movimiento',
              text: 'A partir de ahí verás el resumen del mes y su evolución.',
            },
          ].map((step, i) => (
            <li
              key={step.title}
              className="grid grid-cols-[2rem_1fr] items-center gap-x-4 gap-y-3 p-5 sm:grid-cols-[2rem_1fr_auto] sm:p-6"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
              {step.action && <div className="col-start-2 sm:col-start-3">{step.action}</div>}
            </li>
          ))}
        </ol>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title={formatMonthYear(now)}
        description="Resumen del mes en curso"
        actions={<NewTransactionDialog accounts={accountOptions} categories={categoryOptions} />}
      />

      {pendingCount > 0 && pendingAccountId && (
        <Link
          href={`/accounts/${pendingAccountId}`}
          className="group flex items-center gap-3 rounded-xl bg-warning-soft px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <ClockIcon aria-hidden className="size-4 shrink-0 text-warning" />
          <span className="flex-1">
            {pendingCount === 1
              ? 'Tienes 1 compra de tu plan de aportación pendiente de confirmar.'
              : `Tienes ${pendingCount} compras de tu plan de aportación pendientes de confirmar.`}
          </span>
          <span className="flex shrink-0 items-center gap-1 font-medium">
            Revisar
            <ArrowRightIcon
              aria-hidden
              className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Balance del mes */}
        <section
          aria-labelledby="balance-mes"
          className="surface animate-rise flex flex-col p-5 sm:p-7"
        >
          <h2 id="balance-mes" className="text-sm text-muted-foreground">
            Balance del mes
          </h2>
          <Amount
            cents={balance}
            className={cn(
              'mt-1 block text-[2.75rem] leading-none font-semibold tracking-[-0.035em] sm:text-[3.5rem]',
              balance < 0 && 'text-negative'
            )}
          />
          <p className="mt-2 text-[0.8125rem] text-muted-foreground">
            Ingresos menos gastos e inversión
          </p>

          {allocation.length > 0 && (
            <div className="mt-7">
              <div
                className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
                role="img"
                aria-label={allocation
                  .map((s) => `${s.label}: ${Math.round((s.cents / base) * 100)} %`)
                  .join(', ')}
              >
                {allocation.map((s) => (
                  <span
                    key={s.key}
                    className={cn('h-full first:rounded-l-full last:rounded-r-full', s.color)}
                    style={{ width: `${(s.cents / base) * 100}%` }}
                  />
                ))}
              </div>
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {allocation.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5">
                    <span aria-hidden className={cn('size-2 rounded-[3px]', s.color)} />
                    {s.label}
                    <span className="num font-medium text-foreground">
                      {Math.round((s.cents / base) * 100)} %
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div aria-hidden className="min-h-7 flex-1" />
          <dl className="grid grid-cols-3 gap-3 border-t border-border/70 pt-5">
            {stats.map((s) => {
              const good = s.change !== null && (s.change >= 0 ? s.upIsGood : !s.upIsGood)
              return (
                <div key={s.label} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-[0.8125rem]">
                    <span aria-hidden className={cn('size-2 rounded-[3px]', s.dot)} />
                    {s.label}
                  </dt>
                  <dd>
                    <Amount
                      cents={s.cents}
                      className="mt-1 block truncate text-base font-semibold tracking-[-0.015em] sm:text-lg"
                    />
                  </dd>
                  {s.change !== null && Math.abs(s.change) >= 0.5 && (
                    <dd
                      className={cn('num mt-0.5 text-xs', good ? 'text-positive' : 'text-negative')}
                    >
                      {s.change > 0 ? '↑' : '↓'}{' '}
                      {Math.abs(s.change).toLocaleString('es-ES', { maximumFractionDigits: 0 })} %
                      <span className="text-muted-foreground"> vs {prevMonthShort}</span>
                    </dd>
                  )}
                </div>
              )
            })}
          </dl>
        </section>

        {/* Cuentas */}
        <section
          aria-labelledby="cuentas-resumen"
          className="surface animate-rise flex flex-col p-5 [animation-delay:60ms] sm:p-6"
        >
          <div className="flex items-baseline justify-between">
            <h2 id="cuentas-resumen" className="text-sm text-muted-foreground">
              Saldo en cuentas
            </h2>
            <Link
              href="/accounts"
              className="rounded text-[0.8125rem] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              Gestionar
            </Link>
          </div>
          <Amount
            cents={netWorth}
            className="mt-1 block text-[2rem] leading-tight font-semibold tracking-[-0.03em]"
          />
          <ul className="mt-5 space-y-3">
            {accounts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                <AccountIcon type={a.type} className="size-8" />
                <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                <Amount
                  cents={a.balance_cents ?? 0}
                  currency={a.currency ?? undefined}
                  className={cn(
                    'text-sm font-medium',
                    (a.balance_cents ?? 0) < 0 && 'text-negative'
                  )}
                />
              </li>
            ))}
          </ul>
          {accounts.length > 5 && (
            <p className="mt-3 text-xs text-muted-foreground">y {accounts.length - 5} más</p>
          )}
        </section>
      </div>

      {budgetHighlights.length > 0 && (
        <section aria-labelledby="presupuestos-resumen" className="surface p-5 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="presupuestos-resumen" className="text-[0.9375rem] font-semibold">
              Presupuestos
              {budgetAlerts > 0 && (
                <span className="ml-2 text-[0.8125rem] font-normal text-muted-foreground">
                  {budgetAlerts === 1
                    ? '1 necesita atención'
                    : `${budgetAlerts} necesitan atención`}
                </span>
              )}
            </h2>
            <Link
              href="/budgets"
              className="group flex shrink-0 items-center gap-1 rounded text-[0.8125rem] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              Ver todos
              <ArrowRightIcon
                aria-hidden
                className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {budgetHighlights.map((b) => (
              <li key={b.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">
                      {b.icon ? `${b.icon} ` : ''}
                      {b.name}
                    </span>
                    {b.status !== 'ok' && <BudgetStatusBadge status={b.status} />}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    <Amount cents={b.spentCents} className="font-medium text-foreground" /> /{' '}
                    <Amount cents={b.budgetCents} />
                  </span>
                </div>
                <BudgetBar ratio={b.ratio} status={b.status} className="h-1.5" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Gasto por categoría */}
        <section aria-labelledby="gasto-categoria" className="surface p-5 sm:p-6">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 id="gasto-categoria" className="text-[0.9375rem] font-semibold">
              En qué se va el dinero
            </h2>
            <span className="text-xs text-muted-foreground">Este mes</span>
          </div>
          {topCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay gastos este mes.
            </p>
          ) : (
            <ul className="space-y-4">
              {topCategories.map((c) => (
                <li key={c.name}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">
                      {c.icon ? `${c.icon} ` : ''}
                      {c.name}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      <span className="num text-xs text-muted-foreground">
                        {Math.round((c.cents / current.expense) * 100)} %
                      </span>
                      <Amount cents={c.cents} className="font-medium" />
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-chart-3"
                      style={{ width: `${Math.max((c.cents / maxCategory) * 100, 2)}%` }}
                    />
                  </div>
                </li>
              ))}
              {restCents > 0 && (
                <li className="flex justify-between text-sm text-muted-foreground">
                  <span>Resto de categorías</span>
                  <Amount cents={restCents} />
                </li>
              )}
            </ul>
          )}
        </section>

        {/* Últimos movimientos */}
        <section aria-labelledby="ultimos" className="surface flex flex-col p-5 sm:p-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="ultimos" className="text-[0.9375rem] font-semibold">
              Últimos movimientos
            </h2>
            <Link
              href="/transactions"
              className="group flex items-center gap-1 rounded text-[0.8125rem] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              Ver todos
              <ArrowRightIcon
                aria-hidden
                className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
              <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-brand">
                <CheckIcon aria-hidden className="size-4" />
              </span>
              <p className="text-sm text-muted-foreground">
                Todo listo. Registra tu primer movimiento.
              </p>
            </div>
          ) : (
            <ul className="-mx-2 divide-y divide-border/60">
              {recent.map((t) => {
                const category = first(t.categories)
                const account = first(t.accounts)
                return (
                  <li key={t.id} className="flex items-center gap-3 px-2 py-2.5">
                    {t.transfer_id ? (
                      <TransferBadge className="size-8" />
                    ) : (
                      <CategoryBadge
                        type={category?.type}
                        emoji={category?.icon}
                        className="size-8"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.description ||
                          (t.transfer_id ? 'Traspaso' : category?.name) ||
                          'Sin descripción'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground first-letter:uppercase">
                        {formatDayHeading(t.transaction_date)}
                        {account?.name
                          ? t.transfer_id
                            ? ` · desde ${account.name}`
                            : ` · ${account.name}`
                          : ''}
                      </p>
                    </div>
                    <Amount
                      cents={t.transfer_id ? Math.abs(t.amount_cents) : t.amount_cents}
                      currency={t.currency}
                      signed={!t.transfer_id}
                      className="text-sm font-semibold"
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  )
}
