import { z } from 'zod'

export const transactionSchema = z.object({
  accountId: z.string().uuid('Selecciona una cuenta'),
  categoryId: z.string().uuid('Selecciona una categoría'),
  amount: z.number().positive('El importe debe ser mayor que 0'),
  description: z.string().max(200).optional().or(z.literal('')),
  transactionDate: z.string().min(1, 'Selecciona una fecha'),
})

export type TransactionInput = z.infer<typeof transactionSchema>
