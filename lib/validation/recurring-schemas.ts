import { z } from 'zod'

export const recurringSchema = z.object({
  accountId: z.string().uuid('Selecciona una cuenta'),
  categoryId: z.string().uuid('Selecciona una categoría'),
  amount: z.number().positive('El importe debe ser mayor que 0'),
  frequency: z.enum(['weekly', 'monthly', 'yearly']),
  nextRunDate: z.string().min(1, 'Selecciona una fecha de inicio'),
})

export type RecurringInput = z.infer<typeof recurringSchema>

export const FREQUENCY_LABELS: Record<RecurringInput['frequency'], string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
}
