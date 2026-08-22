import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string; type: string }[]
  current: { accountId?: string; categoryId?: string; from?: string; to?: string }
}

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  investment: 'Inversión',
}

export function TransactionFilters({ accounts, categories, current }: Props) {
  return (
    <form method="get" className="flex flex-wrap gap-3 items-end rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor="accountId">Cuenta</Label>
        <select
          id="accountId"
          name="accountId"
          defaultValue={current.accountId ?? ''}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="categoryId">Categoría</Label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={current.categoryId ?? ''}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {CATEGORY_TYPE_LABELS[c.type]} · {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="from">Desde</Label>
        <Input id="from" name="from" type="date" defaultValue={current.from ?? ''} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="to">Hasta</Label>
        <Input id="to" name="to" type="date" defaultValue={current.to ?? ''} />
      </div>

      <Button type="submit">Filtrar</Button>
      <Button type="button" variant="ghost" asChild>
        <Link href="/transactions">Limpiar</Link>
      </Button>
    </form>
  )
}
