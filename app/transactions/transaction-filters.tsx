import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { CATEGORY_TYPE_META, isCategoryType } from '@/components/category-type'

type Props = {
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string; type: string }[]
  current: { accountId?: string; categoryId?: string; from?: string; to?: string }
  hasFilters: boolean
}

export function TransactionFilters({ accounts, categories, current, hasFilters }: Props) {
  const types = (['expense', 'income', 'investment'] as const).filter((type) =>
    categories.some((c) => c.type === type)
  )

  return (
    <form
      method="get"
      role="search"
      aria-label="Filtrar movimientos"
      className="surface grid grid-cols-2 items-end gap-3 p-3 sm:p-4 lg:grid-cols-[1fr_1fr_9.5rem_9.5rem_auto]"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="filter-account" className="text-xs text-muted-foreground">
          Cuenta
        </Label>
        <NativeSelect id="filter-account" name="accountId" defaultValue={current.accountId ?? ''}>
          <option value="">Todas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="filter-category" className="text-xs text-muted-foreground">
          Categoría
        </Label>
        <NativeSelect
          id="filter-category"
          name="categoryId"
          defaultValue={current.categoryId ?? ''}
        >
          <option value="">Todas</option>
          {types.map((type) => (
            <optgroup key={type} label={CATEGORY_TYPE_META[type].plural}>
              {categories
                .filter((c) => isCategoryType(c.type) && c.type === type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="filter-from" className="text-xs text-muted-foreground">
          Desde
        </Label>
        <Input id="filter-from" name="from" type="date" defaultValue={current.from ?? ''} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="filter-to" className="text-xs text-muted-foreground">
          Hasta
        </Label>
        <Input id="filter-to" name="to" type="date" defaultValue={current.to ?? ''} />
      </div>

      <div className="col-span-2 flex gap-2 lg:col-span-1">
        <Button type="submit" variant="secondary" className="h-10 flex-1 lg:flex-none">
          Aplicar
        </Button>
        {hasFilters && (
          <Button type="button" variant="ghost" className="h-10" asChild>
            <Link href="/transactions">Limpiar</Link>
          </Button>
        )}
      </div>
    </form>
  )
}
