import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRightIcon, CheckIcon, DownloadIcon, SmartphoneIcon } from 'lucide-react'
import { RevealOnView } from '@/components/reveal-on-view'
import { buildDemo, ledgerEntries, type DemoData } from '@/lib/demo-data'
import { BrandMark } from '@/components/brand-mark'
import { Amount } from '@/components/amount'
import { BudgetBar, BudgetStatusBadge } from '@/components/budget-progress'
import { GoalStatusBadge, goalBarStatus } from '@/components/goal-status'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EvolutionChart } from './reports/evolution-chart'

/*
 * Landing pública en «/» para quien no tiene sesión (con sesión, «/» es el inicio).
 * Todo lo que se ve son datos de ejemplo (lib/demo-data.ts), marcados como tales.
 */

const linkClass =
  'rounded-md font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40'

export function Landing() {
  const now = new Date()
  const demo = buildDemo(now)
  const entries = ledgerEntries(now)
  const monthName = format(demo.month, 'MMMM', { locale: es })

  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <span className="flex items-center gap-2.5 text-[0.9375rem] font-semibold tracking-[-0.01em]">
          <BrandMark />
          Finanzas
        </span>
        <nav aria-label="Principal" className="ml-auto flex items-center gap-1 text-sm sm:gap-2">
          <Link href="/help" className="hidden rounded-lg px-3 py-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 sm:block">
            Ayuda
          </Link>
          <Link href="/login" className="rounded-lg px-3 py-1.5 font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40">
            Entrar
          </Link>
          <Link href="/register" className={buttonVariants({ size: 'sm' })}>
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main id="contenido" className="flex-1">
        {/* Primer pantallazo: la promesa y la libreta que se convierte en la app. */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16 lg:pt-20 lg:pb-28">
          <div className="max-w-xl">
            <h1 className="text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.04em] sm:text-[4rem] lg:text-[4.5rem]">
              Tú apuntas.
              <br />
              <span className="text-muted-foreground">La app hace las cuentas.</span>
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
              Como la libreta de gastos de toda la vida, pero que suma sola: el saldo de cada
              cuenta, en qué se te va el dinero, tus presupuestos y cuánto ahorras.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem] font-medium">
              {['Sin conectar el banco', 'Sin anuncios', 'Gratis'].map((claim) => (
                <li key={claim} className="flex items-center gap-1.5">
                  <CheckIcon aria-hidden className="size-4 shrink-0 text-brand" strokeWidth={2.5} />
                  {claim}
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/demo" className={buttonVariants({ size: 'lg' })}>
                Probar la demo
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
              <Link href="/register" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                Crear cuenta
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              La demo no pide registro. ¿Ya tienes cuenta?{' '}
              <Link href="/login" className={linkClass}>
                Entrar
              </Link>
            </p>
          </div>

          <Ledger entries={entries} demo={demo} monthName={monthName} />
        </section>

        <Outputs demo={demo} monthName={monthName} />

        {/* Pasaje tranquilo: la postura sobre los datos. */}
        <section aria-labelledby="tus-datos" className="border-y border-border/70 bg-card">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:py-28">
            <h2 id="tus-datos" className="text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-[3rem]">
              Tu banco
              <br />
              no se entera.
            </h2>
            <div className="space-y-5 text-[1.0625rem] leading-relaxed text-muted-foreground lg:pt-3">
              <p>
                No hay que darle a nadie tus claves ni conectar cuentas. Apuntas tú, en un momento,
                desde el móvil o el ordenador, y la app pone el signo: un gasto resta y un ingreso
                suma.
              </p>
              <p>
                Cada usuario ve solo lo suyo. Sin anuncios, y lo que apuntas lo puedes sacar a
                Excel o PDF cuando quieras.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="instalar" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <SmartphoneIcon aria-hidden className="size-5" strokeWidth={1.75} />
              </span>
              <div>
                <h2 id="instalar" className="text-xl font-semibold tracking-[-0.02em]">
                  En el móvil, como una app más
                </h2>
                <p className="mt-1 max-w-xl text-muted-foreground">
                  Sin pasar por ninguna tienda: se añade a la pantalla de inicio del iPhone, de un
                  Android o del ordenador.
                </p>
              </div>
            </div>
            <Link href="/help#instalar" className={cn(buttonVariants({ variant: 'outline' }), 'self-start sm:self-auto')}>
              Cómo instalarla
            </Link>
          </div>
        </section>

        <section aria-labelledby="empieza" className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
          <div className="rounded-[1.75rem] bg-primary px-6 py-14 text-primary-foreground sm:px-12 sm:py-16">
            <h2 id="empieza" className="max-w-2xl text-[2rem] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[2.75rem]">
              Mira cómo quedaría con un mes de verdad.
            </h2>
            <p className="mt-4 max-w-xl text-primary-foreground/70">
              La demo está llena de apuntes de ejemplo. Cuando quieras los tuyos, crea una cuenta:
              es gratis.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className={cn(buttonVariants({ size: 'lg' }), 'bg-primary-foreground text-primary hover:bg-primary-foreground/90')}
              >
                Probar la demo
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'ghost' }),
                  'text-primary-foreground ring-1 ring-primary-foreground/25 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                )}
              >
                Crear cuenta gratis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <BrandMark className="size-5" />
            Finanzas
          </span>
          <Link href="/help" className="hover:text-foreground">
            Ayuda
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Entrar
          </Link>
          <span className="sm:ml-auto">Las cifras de esta página son datos de ejemplo.</span>
        </div>
      </footer>
    </div>
  )
}

/** La libreta: cuatro apuntes que se escriben y cuya suma cristaliza en el resumen de la app. */
function Ledger({
  entries,
  demo,
  monthName,
}: {
  entries: DemoData['monthRows']
  demo: DemoData
  monthName: string
}) {
  // El resto de apuntes del mes, plegados en un renglón: así la suma es el balance.
  const shown = entries.reduce((sum, e) => sum + e.amount_cents, 0)
  const restCount = demo.monthRows.length - entries.length
  const restCents = demo.balanceCents - shown
  const food = demo.budgets.find((b) => b.categoryId === 'alimentacion')
  const rows = entries.length + 1
  const settleDelay = 250 + rows * 260 + 250

  return (
    <RevealOnView>
      <figure className="relative" aria-label={`Libreta de ejemplo: apuntes de ${monthName} y su resumen`}>
        <div className="surface overflow-hidden">
          <div className="flex items-baseline justify-between px-6 pt-5 pb-3">
            <p className="text-lg font-semibold capitalize tracking-[-0.02em]">{monthName}</p>
            <p className="text-xs text-muted-foreground">Datos de ejemplo</p>
          </div>

          {/* Renglones con margen, como una libreta de cuentas. */}
          <div className="relative">
            <span aria-hidden className="absolute inset-y-0 left-[4.25rem] w-px bg-negative/35" />
            <ol className="text-[0.9375rem]">
              {entries.map((e, i) => (
                <li
                  key={e.id}
                  className="animate-ink grid grid-cols-[4.25rem_1fr_auto] items-baseline border-t border-border/80 py-3 pr-6"
                  style={{ animationDelay: `${250 + i * 260}ms` }}
                >
                  <span className="num pl-6 text-xs text-muted-foreground">
                    {format(new Date(`${e.transaction_date}T12:00:00`), 'd MMM', { locale: es }).replace('.', '')}
                  </span>
                  <span className="truncate pl-4">{e.description}</span>
                  <Amount cents={e.amount_cents} signed className="pl-3 font-medium" />
                </li>
              ))}
              <li
                className="animate-ink grid grid-cols-[4.25rem_1fr_auto] items-baseline border-t border-border/80 py-3 pr-6 text-muted-foreground"
                style={{ animationDelay: `${250 + entries.length * 260}ms` }}
              >
                <span />
                <span className="truncate pl-4">+ {restCount} apuntes más</span>
                <Amount cents={restCents} signed className="pl-3 font-medium" />
              </li>
            </ol>
            {/* Doble raya de suma, como en contabilidad. */}
            <div
              className="animate-ink grid grid-cols-[4.25rem_1fr_auto] items-baseline border-t-[3px] border-double border-foreground/70 py-3 pr-6"
              style={{ animationDelay: `${250 + rows * 260}ms` }}
            >
              <span />
              <span className="pl-4 text-sm text-muted-foreground">Suma</span>
              <Amount cents={demo.balanceCents} signed className="pl-3 font-semibold" />
            </div>
          </div>

          {/* La suma cristaliza en el resumen de la app. */}
          <div
            className="animate-settle border-t border-border/80 bg-muted/50 px-6 pt-5 pb-6"
            style={{ animationDelay: `${settleDelay}ms` }}
          >
            <p className="text-sm text-muted-foreground">Balance de {monthName}</p>
            <Amount
              cents={demo.balanceCents}
              className="mt-0.5 block text-[2.5rem] leading-none font-semibold tracking-[-0.035em]"
            />
            {food && (
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">
                      {food.icon} {food.name}
                    </span>
                    {food.status !== 'ok' && <BudgetStatusBadge status={food.status} />}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    <Amount cents={food.spentCents} className="font-medium text-foreground" />
                      <span className="hidden sm:inline"> / <Amount cents={food.budgetCents} /></span>
                  </span>
                </div>
                <BudgetBar ratio={food.ratio} status={food.status} className="h-1.5" />
              </div>
            )}
          </div>
        </div>
      </figure>
    </RevealOnView>
  )
}

/** Lo que sale de la libreta: cada cosa enseñada con la pieza real de la app. */
function Outputs({ demo, monthName }: { demo: DemoData; monthName: string }) {
  const goals = demo.goals.slice(0, 2)
  return (
    <section aria-labelledby="sale" className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 lg:pb-32">
      <h2 id="sale" className="max-w-2xl text-[2rem] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[2.5rem]">
        De esos apuntes sale todo lo demás.
      </h2>

      <div className="mt-14 grid gap-x-16 gap-y-16 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.015em]">Presupuestos que avisan</h3>
          <p className="mt-1.5 max-w-md text-muted-foreground">
            Un límite al mes por categoría. Al 80 % te avisa; las subcategorías suman a su
            categoría.
          </p>
          <ul className="surface mt-6 space-y-4 p-5">
            {demo.budgets.map((b) => (
              <li key={b.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">
                      {b.icon} {b.name}
                    </span>
                    {b.status !== 'ok' && <BudgetStatusBadge status={b.status} />}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    <Amount cents={b.spentCents} className="font-medium text-foreground" />
                    <span className="hidden sm:inline"> / <Amount cents={b.budgetCents} /></span>
                  </span>
                </div>
                <BudgetBar ratio={b.ratio} status={b.status} className="h-1.5" />
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:pt-24">
          <h3 className="text-lg font-semibold tracking-[-0.015em]">Objetivos con fecha</h3>
          <p className="mt-1.5 max-w-md text-muted-foreground">
            Aparta para lo que importa: te dice cuánto te falta, cuánto aportar al mes y si llegas a
            tiempo.
          </p>
          <ul className="surface mt-6 space-y-5 p-5">
            {goals.map((g) => (
              <li key={g.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">
                      {g.icon} {g.name}
                    </span>
                    <GoalStatusBadge status={g.status} />
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    <Amount cents={g.savedCents} className="font-medium text-foreground" />
                    <span className="hidden sm:inline"> / <Amount cents={g.targetCents} /></span>
                  </span>
                </div>
                <BudgetBar ratio={g.ratio} status={goalBarStatus(g.status)} className="h-1.5" />
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.015em]">El año de un vistazo</h3>
              <p className="mt-1.5 max-w-md text-muted-foreground">
                Ingresos, inversión, gastos y balance, mes a mes o año a año.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <EvolutionChart data={demo.evolution} title="Doce meses de ejemplo" />
          </div>
        </div>

        <div className="grid items-center gap-8 lg:col-span-2 lg:grid-cols-[1fr_minmax(0,26rem)]">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.015em]">El informe del mes, en PDF</h3>
            <p className="mt-1.5 max-w-md text-muted-foreground">
              Lo que entró, lo que salió, en qué categorías y cómo vas con presupuestos y objetivos.
              También el del año entero, comparado con el anterior.
            </p>
          </div>
          {/* El resumen que abre el informe del mes. */}
          <div className="surface p-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-lg font-semibold">Informe de {monthName}</p>
              <DownloadIcon aria-hidden className="mt-1 size-4 text-muted-foreground" />
            </div>
            <dl className="mt-5 divide-y divide-border/70 text-sm">
              {[
                { label: 'Ingresos', cents: demo.totals.income },
                { label: 'Gastos', cents: demo.totals.expense },
                { label: 'Inversión', cents: demo.totals.investment },
              ].map((r) => (
                <div key={r.label} className="flex justify-between py-2">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd>
                    <Amount cents={r.cents} className="font-medium" />
                  </dd>
                </div>
              ))}
              <div className="flex justify-between pt-3">
                <dt className="font-medium">Balance</dt>
                <dd>
                  <Amount cents={demo.balanceCents} className="font-semibold" />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
