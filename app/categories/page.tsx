import type { Metadata } from 'next'
import { TagIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, PageShell } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { CATEGORY_TYPE_META, CategoryBadge, type CategoryType } from '@/components/category-type'
import { NewCategoryDialog } from './new-category-dialog'
import { DeleteCategoryButton } from './delete-category-button'

export const metadata: Metadata = { title: 'Categorías' }

type Category = {
  id: string
  name: string
  type: 'income' | 'expense' | 'investment'
  parent_id: string | null
  icon: string | null
}

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, type, parent_id, icon')
    .order('name', { ascending: true })

  const categories = (data ?? []) as Category[]

  return (
    <PageShell>
      <PageHeader
        title="Categorías"
        description="Agrupan tus movimientos y deciden si suman o restan."
        actions={<NewCategoryDialog categories={categories} />}
      />

      {categories.length === 0 && (
        <EmptyState
          icon={TagIcon}
          title="No hay categorías"
          description="Crea categorías de ingreso, gasto o inversión para clasificar tus movimientos."
          action={<NewCategoryDialog categories={categories} />}
        />
      )}

      {/* Gastos (la lista más larga) a la izquierda; ingresos e inversión apilados a la derecha. */}
      <div className="grid items-start gap-8 lg:grid-cols-2">
        {[['expense'], ['income', 'investment']].map((column) => (
          <div key={column.join()} className="space-y-8">
            {(column as CategoryType[]).map((type) => {
              const topLevel = categories.filter((c) => c.type === type && c.parent_id === null)
              if (topLevel.length === 0) return null
              const meta = CATEGORY_TYPE_META[type]
              const count = categories.filter((c) => c.type === type).length

              return (
                <section key={type} aria-labelledby={`tipo-${type}`}>
                  <div className="mb-2 flex items-baseline justify-between px-1">
                    <h2 id={`tipo-${type}`} className="text-[0.9375rem] font-semibold">
                      {meta.plural}
                    </h2>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </div>
                  <ul className="surface divide-y divide-border/70 overflow-hidden">
                    {topLevel.map((parent) => {
                      const children = categories.filter((c) => c.parent_id === parent.id)
                      return (
                        <li key={parent.id}>
                          <div className="flex items-center gap-3 py-2.5 pr-2 pl-3.5">
                            <CategoryBadge
                              type={parent.type}
                              emoji={parent.icon}
                              className="size-8"
                            />
                            <p className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">
                              {parent.name}
                            </p>
                            <DeleteCategoryButton id={parent.id} name={parent.name} />
                          </div>
                          {children.length > 0 && (
                            <ul className="pb-2">
                              {children.map((child) => (
                                <li
                                  key={child.id}
                                  className="flex items-center gap-3 py-1 pr-2 pl-13"
                                >
                                  <span aria-hidden className="h-px w-2.5 shrink-0 bg-border" />
                                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                                    {child.icon ? `${child.icon} ` : ''}
                                    {child.name}
                                  </span>
                                  <DeleteCategoryButton id={child.id} name={child.name} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        ))}
      </div>
    </PageShell>
  )
}
