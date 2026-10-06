import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(80, 'Máximo 80 caracteres'),
  icon: z.string().trim().max(8).optional(),
  target: z.number().positive('El importe debe ser mayor que 0'),
  /** Opcional: cadena vacía = sin fecha. */
  targetDate: z.union([isoDate, z.literal('')]),
})

export type GoalInput = z.infer<typeof goalSchema>

export const contributionSchema = z.object({
  goalId: z.string().uuid(),
  kind: z.enum(['deposit', 'withdraw']),
  amount: z.number().positive('El importe debe ser mayor que 0'),
  date: isoDate,
  note: z.string().trim().max(120, 'Máximo 120 caracteres').optional(),
})

export type ContributionInput = z.infer<typeof contributionSchema>
