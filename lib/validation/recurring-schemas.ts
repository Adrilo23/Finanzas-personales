import { z } from 'zod'
import { positiveAmount } from './money-schemas'

export const recurringSchema = z.object({
  accountId: z.string().uuid('Selecciona una cuenta'),
  categoryId: z.string().uuid('Selecciona una categoría'),
  amount: positiveAmount,
  frequency: z.enum(['weekly', 'monthly', 'yearly']),
  nextRunDate: z
    .string()
    .min(1, 'Selecciona una fecha de inicio')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida'),
})

export type RecurringInput = z.infer<typeof recurringSchema>

export const FREQUENCY_LABELS: Record<RecurringInput['frequency'], string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
}

export const recurringTransferSchema = z
  .object({
    fromAccountId: z.string().uuid('Selecciona la cuenta de origen'),
    toAccountId: z.string().uuid('Selecciona la cuenta de destino'),
    amount: positiveAmount,
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    nextRunDate: z
      .string()
      .min(1, 'Selecciona una fecha de inicio')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida'),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'La cuenta de origen y la de destino deben ser distintas',
    path: ['toAccountId'],
  })

export type RecurringTransferInput = z.infer<typeof recurringTransferSchema>
