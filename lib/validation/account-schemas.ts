import { z } from 'zod'

export const accountSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(60),
  type: z.enum(['bank', 'cash', 'card', 'other']),
  currency: z.string().length(3),
  initialBalance: z.coerce.number().min(0, 'No puede ser negativo'),
})

export type AccountInput = z.infer<typeof accountSchema>

export const ACCOUNT_TYPE_LABELS: Record<AccountInput['type'], string> = {
  bank: 'Cuenta bancaria',
  cash: 'Efectivo',
  card: 'Tarjeta',
  other: 'Otro',
}