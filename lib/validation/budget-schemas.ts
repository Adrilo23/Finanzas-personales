import { z } from 'zod'

export const budgetSchema = z.object({
  categoryId: z.string().uuid('Selecciona una categoría'),
  amount: z.number().positive('El importe debe ser mayor que 0'),
})

export type BudgetInput = z.infer<typeof budgetSchema>
