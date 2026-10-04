'use server'

import { createClient } from '@/lib/supabase/server'
import { holdingSchema, operationSchema } from '@/lib/validation/investment-schemas'
import { eurosToCents } from '@/lib/money'
import { roundUnits } from '@/lib/investments'
import { storePriceHistory, yahooProvider } from '@/lib/prices'
import { revalidatePath } from 'next/cache'

function revalidateInvestmentViews(accountId: string) {
  revalidatePath(`/accounts/${accountId}`)
  revalidatePath('/accounts')
  revalidatePath('/')
}

/** Añade un fondo (por ISIN) o una criptomoneda (por código) a una cuenta de inversión. */
export async function addHolding(accountId: string, formData: FormData) {
  const parsed = holdingSchema.safeParse({
    assetType: formData.get('assetType'),
    isin: formData.get('isin') ?? undefined,
    ticker: formData.get('ticker') ?? undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  // La FK no pasa por RLS: comprobamos que la cuenta es del usuario y de inversión.
  const { data: account } = await supabase
    .from('accounts')
    .select('type')
    .eq('id', accountId)
    .maybeSingle()
  if (!account || account.type !== 'investment') {
    return { error: 'La cuenta no es de inversión' }
  }

  let info
  try {
    info =
      parsed.data.assetType === 'fund'
        ? await yahooProvider.findFund(parsed.data.isin)
        : await yahooProvider.findCrypto(parsed.data.ticker)
  } catch {
    return { error: 'No se ha podido consultar la fuente de precios. Inténtalo en un rato.' }
  }
  if (!info) {
    return {
      error:
        parsed.data.assetType === 'fund'
          ? 'No encontramos ese ISIN en la fuente de precios.'
          : 'No encontramos esa criptomoneda cotizando en euros.',
    }
  }
  if (info.currency && info.currency !== 'EUR') {
    return {
      error: `De momento solo se admiten activos en euros (este cotiza en ${info.currency}).`,
    }
  }

  const { error } = await supabase.from('holdings').insert({
    user_id: user.id,
    account_id: accountId,
    asset_type: parsed.data.assetType,
    isin: parsed.data.assetType === 'fund' ? parsed.data.isin : null,
    symbol: info.symbol,
    name: info.name,
    currency: 'EUR',
    prices_checked_at: new Date().toISOString(),
  })
  if (error) {
    if (error.code === '23505') return { error: 'Ese activo ya está en esta cuenta.' }
    return { error: error.message }
  }

  // Precios de los últimos meses, para que el valor aparezca al momento.
  try {
    await storePriceHistory(supabase, user.id, info.symbol, 'EUR', '3mo')
  } catch {
    // Sin precio de momento: se reintentará en el siguiente refresco.
  }

  revalidateInvestmentViews(accountId)
  return { success: true }
}

export async function deleteHolding(id: string, accountId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('holdings').delete().eq('id', id)
  if (error) {
    return { error: error.message }
  }
  revalidateInvestmentViews(accountId)
  return { success: true }
}

/** Registra una compra o venta con las participaciones que indica el bróker. */
export async function addOperation(holdingId: string, formData: FormData) {
  const parsed = operationSchema.safeParse({
    kind: formData.get('kind'),
    operationDate: formData.get('operationDate'),
    units: Number(formData.get('units')),
    amount: Number(formData.get('amount')),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autenticado' }
  }

  const { data: holding } = await supabase
    .from('holding_values')
    .select('account_id, units')
    .eq('id', holdingId)
    .maybeSingle()
  if (!holding?.account_id) {
    return { error: 'El activo no existe' }
  }

  const units = roundUnits(parsed.data.units)
  if (parsed.data.kind === 'sell' && units > Number(holding.units ?? 0) + 1e-9) {
    return { error: 'No puedes vender más participaciones de las que tienes.' }
  }

  const { error } = await supabase.from('holding_operations').insert({
    user_id: user.id,
    holding_id: holdingId,
    kind: parsed.data.kind,
    operation_date: parsed.data.operationDate,
    units,
    amount_cents: eurosToCents(parsed.data.amount),
  })
  if (error) {
    return { error: error.message }
  }

  revalidateInvestmentViews(holding.account_id)
  return { success: true }
}

export async function deleteOperation(id: string, accountId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('holding_operations').delete().eq('id', id)
  if (error) {
    return { error: error.message }
  }
  revalidateInvestmentViews(accountId)
  return { success: true }
}
