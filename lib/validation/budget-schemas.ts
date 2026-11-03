import { z } from 'zod'
import { positiveAmount } from './money-schemas'

export const budgetSchema = z.object({
  categoryId: z.string().uuid('Selecciona una categoría'),
  amount: positiveAmount,
})

export type BudgetInput = z.infer<typeof budgetSchema>
