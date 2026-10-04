/**
 * Traspasos entre cuentas: dos movimientos enlazados por transfer_id, sin categoría.
 * Pata de salida (negativa) en la cuenta origen y pata de entrada (positiva) en la destino.
 * Lógica pura, sin base de datos, para poder testearla.
 */

export type TransferRowInput = {
  userId: string
  transferId: string
  fromAccountId: string
  toAccountId: string
  /** Importe positivo en céntimos. */
  amountCents: number
  date: string
  description?: string | null
  recurringRuleId?: string | null
}

/** Las dos filas de `transactions` de un traspaso. Se insertan juntas (una sola sentencia). */
export function buildTransferRows(input: TransferRowInput) {
  const amount = Math.abs(input.amountCents)
  const common = {
    user_id: input.userId,
    transfer_id: input.transferId,
    category_id: null,
    currency: 'EUR',
    description: input.description || null,
    transaction_date: input.date,
    recurring_rule_id: input.recurringRuleId ?? null,
  }
  return [
    { ...common, account_id: input.fromAccountId, amount_cents: -amount },
    { ...common, account_id: input.toAccountId, amount_cents: amount },
  ]
}

export type TransferLeg = {
  transfer_id: string | null
  account_id: string
  amount_cents: number
  accountName?: string | null
}

export type TransferInfo = {
  fromAccountId: string | null
  fromName: string | null
  toAccountId: string | null
  toName: string | null
  amountCents: number
}

/**
 * Agrupa las patas por traspaso para saber origen y destino. Si falta una pata
 * (p. ej. se borró la cuenta del otro lado), ese extremo queda en null.
 */
export function pairTransferLegs(legs: TransferLeg[]): Map<string, TransferInfo> {
  const map = new Map<string, TransferInfo>()
  for (const leg of legs) {
    if (!leg.transfer_id) continue
    const info = map.get(leg.transfer_id) ?? {
      fromAccountId: null,
      fromName: null,
      toAccountId: null,
      toName: null,
      amountCents: Math.abs(leg.amount_cents),
    }
    if (leg.amount_cents < 0) {
      info.fromAccountId = leg.account_id
      info.fromName = leg.accountName ?? null
    } else {
      info.toAccountId = leg.account_id
      info.toName = leg.accountName ?? null
    }
    map.set(leg.transfer_id, info)
  }
  return map
}

/**
 * En una lista sin filtro de cuenta, cada traspaso se muestra una sola vez (la pata
 * de salida) y no cuenta en entradas/salidas. Con filtro de cuenta se muestra la
 * pata de esa cuenta, que sí es una entrada o salida real de esa cuenta.
 */
export function isHiddenTransferLeg(
  row: { transfer_id: string | null; amount_cents: number },
  filteringByAccount: boolean
): boolean {
  return !filteringByAccount && row.transfer_id !== null && row.amount_cents > 0
}
