import { z } from 'zod'

export const accountSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(60),
  type: z.enum(['bank', 'cash', 'card', 'investment', 'other']),
  currency: z.string().length(3),
  initialBalance: z.number().min(0, 'No puede ser negativo'),
  // Interés anual opcional de una cuenta remunerada, en % (p. ej. 3 o 2,25).
  interestRate: z
    .number()
    .gt(0, 'El interés debe ser mayor que 0')
    .max(100, 'El interés no puede pasar del 100 %')
    .optional(),
})

export type AccountInput = z.infer<typeof accountSchema>

export const ACCOUNT_TYPE_LABELS: Record<AccountInput['type'], string> = {
  bank: 'Cuenta bancaria',
  cash: 'Efectivo',
  card: 'Tarjeta',
  investment: 'Cuenta de inversión',
  other: 'Otro',
}
