import { createClient } from '@/lib/supabase/server'
import { CATEGORY_TYPE_LABELS } from '@/lib/validation/category-schemas'
import { NewCategoryDialog } from './new-category-dialog'
import { DeleteCategoryButton } from './delete-category-button'

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
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <NewCategoryDialog categories={categories} />
      </div>

      {(['income', 'expense', 'investment'] as const).map((type) => {
        const topLevel = categories.filter((c) => c.type === type && c.parent_id === null)
        if (topLevel.length === 0) return null

        return (
          <section key={type} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">
              {CATEGORY_TYPE_LABELS[type]}
            </h2>
            <div className="divide-y rounded-lg border">
              {topLevel.map((parent) => {
                const children = categories.filter((c) => c.parent_id === parent.id)
                return (
                  <div key={parent.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {parent.icon ? `${parent.icon} ` : ''}
                        {parent.name}
                      </p>
                      <DeleteCategoryButton id={parent.id} />
                    </div>
                    {children.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {children.map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between text-sm text-muted-foreground"
                          >
                            <span>↳ {child.name}</span>
                            <DeleteCategoryButton id={child.id} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}
