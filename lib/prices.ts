import { createClient } from '@/lib/supabase/server'
import {
  cryptoSymbol,
  parseYahooChart,
  parseYahooSearch,
  type InstrumentInfo,
  type PricePoint,
} from '@/lib/investments'

/**
 * Fuente de precios intercambiable. Hoy: API no oficial de Yahoo (gratuita, puede fallar,
 * no apta para uso comercial). Antes de vender la app, sustituir por un proveedor con
 * licencia implementando esta misma interfaz (roadmap, Fase 3b).
 */
export interface PriceProvider {
  findFund(isin: string): Promise<InstrumentInfo | null>
  findCrypto(ticker: string): Promise<InstrumentInfo | null>
  history(symbol: string, range: '1mo' | '3mo'): Promise<PricePoint[]>
}

const TIMEOUT_MS = 5000

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  })
  // 404 = el código no existe en la fuente (no es un fallo): los parse* devuelven vacío.
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Fuente de precios: HTTP ${res.status}`)
  return res.json()
}

const chartUrl = (symbol: string, range: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`

export const yahooProvider: PriceProvider = {
  async findFund(isin) {
    const search = parseYahooSearch(
      await fetchJson(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}&quotesCount=5&newsCount=0`
      )
    )
    if (!search) return null
    const chart = parseYahooChart(await fetchJson(chartUrl(search.symbol, '5d')))
    return { ...search, currency: chart.currency }
  },

  async findCrypto(ticker) {
    const symbol = cryptoSymbol(ticker)
    if (!symbol) return null
    const chart = parseYahooChart(await fetchJson(chartUrl(symbol, '5d')))
    if (chart.prices.length === 0) return null
    return {
      symbol,
      name: (chart.name ?? symbol).replace(/\s+EUR$/, ''),
      currency: chart.currency,
    }
  },

  async history(symbol, range) {
    return parseYahooChart(await fetchJson(chartUrl(symbol, range))).prices
  },
}

/** Cada cuánto se vuelve a consultar la fuente para un mismo activo. */
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/** Descarga y guarda los precios recientes de un activo (asset_prices es por usuario). */
export async function storePriceHistory(
  supabase: SupabaseServer,
  userId: string,
  symbol: string,
  currency: string,
  range: '1mo' | '3mo',
  provider: PriceProvider = yahooProvider
) {
  const prices = await provider.history(symbol, range)
  if (prices.length === 0) return
  await supabase.from('asset_prices').upsert(
    prices.map((p) => ({
      user_id: userId,
      symbol,
      price_date: p.date,
      price: p.price,
      currency,
    })),
    { onConflict: 'user_id,symbol,price_date' }
  )
}

/**
 * Refresca los precios de los activos del usuario que no se hayan consultado en las
 * últimas horas. Se llama al cargar páginas autenticadas (como los recurrentes): casi
 * siempre es una consulta vacía. Los fallos de la fuente se ignoran para no romper la
 * página; se reintentará pasado el intervalo.
 */
export async function refreshStalePrices(userId: string) {
  const supabase = await createClient()
  const threshold = new Date(Date.now() - REFRESH_EVERY_MS).toISOString()

  const { data: stale } = await supabase
    .from('holdings')
    .select('id, symbol, currency')
    .or(`prices_checked_at.is.null,prices_checked_at.lt.${threshold}`)

  if (!stale || stale.length === 0) return

  // Un mismo activo puede estar en varias cuentas: se descarga una vez.
  const bySymbol = new Map(stale.map((h) => [h.symbol, h.currency]))
  await Promise.allSettled(
    [...bySymbol].map(([symbol, currency]) =>
      storePriceHistory(supabase, userId, symbol, currency, '1mo')
    )
  )

  await supabase
    .from('holdings')
    .update({ prices_checked_at: new Date().toISOString() })
    .in(
      'id',
      stale.map((h) => h.id)
    )
}
