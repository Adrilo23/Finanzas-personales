import { z } from 'zod'
import { isValidIsin, normalizeIsin } from '@/lib/investments'

export const holdingSchema = z.discriminatedUnion('assetType', [
  z.object({
    assetType: z.literal('fund'),
    isin: z
      .string()
      .transform(normalizeIsin)
      .refine(isValidIsin, 'ISIN no válido: revisa que tenga 12 caracteres, p. ej. IE00BYX5NX33'),
  }),
  z.object({
    assetType: z.literal('crypto'),
    ticker: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{2,10}(-EUR)?$/i, 'Escribe el código de la criptomoneda, p. ej. BTC'),
  }),
])

export type HoldingInput = z.input<typeof holdingSchema>

export const operationSchema = z.object({
  kind: z.enum(['buy', 'sell']),
  operationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha'),
  units: z.number().positive('Indica las participaciones (mayor que 0)'),
  amount: z.number().positive('El importe debe ser mayor que 0'),
})

export type OperationInput = z.infer<typeof operationSchema>

export const OPERATION_KIND_LABELS: Record<OperationInput['kind'], string> = {
  buy: 'Compra',
  sell: 'Venta',
}
