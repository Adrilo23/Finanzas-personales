import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/money'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import Link from 'next/link'

type Row = {
  amount_cents: number
  categories: { type: string }[] | { type: string } | null
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
  const from = format(startOfMonth(now), 'yyyy-MM-dd')
  const to = format(endOfMonth(now), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('transactions')
    .select('amount_cents, categories(type)')
    .is('deleted_at', null)
    .gte('transaction_date', from)
    .lte('transaction_date', to)

  const rows = (data ?? []) as Row[]

  let income = 0
  let expense = 0
  let investment = 0

  for (const row of rows) {
    const category = first(row.categories)
    if (!category) continue
    if (category.type === 'income') income += row.amount_cents
    else if (category.type === 'expense') expense += Math.abs(row.amount_cents)
    else if (category.type === 'investment') investment += Math.abs(row.amount_cents)
  }

  const balance = income - expense - investment
  const monthLabel = format(now, 'MMMM yyyy')

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold capitalize">{monthLabel}</h1>
        <p className="text-sm text-muted-foreground">Resumen del mes en curso</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Ingresos</p>
          <p className="text-xl font-semibold text-green-600">{formatCents(income)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Gastos</p>
          <p className="text-xl font-semibold text-red-600">{formatCents(expense)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Inversión</p>
          <p className="text-xl font-semibold text-blue-600">{formatCents(investment)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Balance disponible</p>
          <p
            className={`text-xl font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatCents(balance)}
          </p>
        </div>
      </div>

      <nav className="flex gap-4 text-sm underline">
        <Link href="/accounts">Cuentas</Link>
        <Link href="/categories">Categorías</Link>
        <Link href="/transactions">Movimientos</Link>
      </nav>
    </main>
  )
}
