import { z } from 'zod'

export const transactionSchema = z.object({
  accountId: z.string().uuid('Selecciona una cuenta'),
  categoryId: z.string().uuid('Selecciona una categoría'),
  amount: z.number().positive('El importe debe ser mayor que 0'),
  description: z.string().max(200).optional().or(z.literal('')),
  transactionDate: z.string().min(1, 'Selecciona una fecha'),
})

export type TransactionInput = z.infer<typeof transactionSchema>

export const transferSchema = z
  .object({
    fromAccountId: z.string().uuid('Selecciona la cuenta de origen'),
    toAccountId: z.string().uuid('Selecciona la cuenta de destino'),
    amount: z.number().positive('El importe debe ser mayor que 0'),
    description: z.string().max(200).optional().or(z.literal('')),
    transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha'),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'La cuenta de origen y la de destino deben ser distintas',
    path: ['toAccountId'],
  })

export type TransferInput = z.infer<typeof transferSchema>
