import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(60),
  type: z.enum(['income', 'expense', 'investment']),
  parentId: z.string().uuid().optional().or(z.literal('')),
  icon: z.string().max(10).optional().or(z.literal('')),
})

export type CategoryInput = z.infer<typeof categorySchema>

export const CATEGORY_TYPE_LABELS: Record<CategoryInput['type'], string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  investment: 'Inversión',
}
