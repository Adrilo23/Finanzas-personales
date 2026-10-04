/**
 * Lógica pura de inversiones (sin red ni base de datos), para poder testearla.
 * La parte que habla con la fuente de precios está en lib/prices.ts.
 */

/** Normaliza lo que escribe el usuario: mayúsculas y sin espacios. */
export function normalizeIsin(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

/**
 * ISIN válido: 2 letras de país + 9 alfanuméricos + dígito de control.
 * El dígito de control se calcula con Luhn sobre la cadena con las letras
 * convertidas a números (A=10 … Z=35).
 */
export function isValidIsin(value: string): boolean {
  const isin = normalizeIsin(value)
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return false
  const digits = isin
    .split('')
    .map((ch) => (/[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch))
    .join('')
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

/**
 * Participaciones tal como las muestra el bróker: "12,345678" o "12.345678".
 * A diferencia de los importes, aquí no hay separador de miles: un punto o una coma
 * siempre son decimales (1.234 participaciones = 1,234). Inválido → 0.
 */
export function parseUnitsInput(value: unknown): number {
  if (typeof value === 'number') return value
  const text = String(value ?? '')
    .replace(/\s+/g, '')
    .replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) return 0
  return Number(text)
}

/** Las participaciones se guardan con 8 decimales (numeric(20, 8)). */
export function roundUnits(units: number): number {
  return Math.round(units * 1e8) / 1e8
}

export type InstrumentInfo = { symbol: string; name: string; currency: string | null }
export type PricePoint = { date: string; price: number }

type YahooSearchResponse = {
  quotes?: { symbol?: string; quoteType?: string; longname?: string; shortname?: string }[]
}

/** Primer resultado de fondo/ETF de la búsqueda por ISIN en Yahoo. */
export function parseYahooSearch(json: unknown): Omit<InstrumentInfo, 'currency'> | null {
  const quotes = (json as YahooSearchResponse)?.quotes ?? []
  const match = quotes.find(
    (q) => q.symbol && ['MUTUALFUND', 'ETF', 'EQUITY'].includes(q.quoteType ?? '')
  )
  if (!match?.symbol) return null
  return { symbol: match.symbol, name: match.longname || match.shortname || match.symbol }
}

type YahooChartResponse = {
  chart?: {
    result?: {
      meta?: { currency?: string; gmtoffset?: number; longName?: string; shortName?: string }
      timestamp?: number[]
      indicators?: { quote?: { close?: (number | null)[] }[] }
    }[]
  }
}

/**
 * Serie de precios diarios (valor liquidativo o cierre) de la respuesta "chart" de Yahoo. Descarta días sin
 * valor (null) y convierte cada marca de tiempo a la fecha local del mercado.
 */
export function parseYahooChart(json: unknown): {
  currency: string | null
  name: string | null
  prices: PricePoint[]
} {
  const result = (json as YahooChartResponse)?.chart?.result?.[0]
  if (!result) return { currency: null, name: null, prices: [] }
  const offset = result.meta?.gmtoffset ?? 0
  const closes = result.indicators?.quote?.[0]?.close ?? []
  const prices: PricePoint[] = []
  ;(result.timestamp ?? []).forEach((ts, i) => {
    const price = closes[i]
    if (typeof price !== 'number' || !(price > 0)) return
    const date = new Date((ts + offset) * 1000).toISOString().slice(0, 10)
    // Yahoo devuelve floats con ruido (14.416500091552734): 6 decimales sobran para un
    // valor liquidativo o una cotización.
    prices.push({ date, price: Math.round(price * 1e6) / 1e6 })
  })
  return {
    currency: result.meta?.currency ?? null,
    name: result.meta?.longName ?? result.meta?.shortName ?? null,
    prices,
  }
}

/**
 * Código de una criptomoneda en la fuente de precios, cotizada en euros:
 * "btc" → "BTC-EUR". Solo letras/números, de 2 a 10 caracteres; si no, null.
 */
export function cryptoSymbol(ticker: string): string | null {
  const t = ticker.trim().toUpperCase().replace(/-EUR$/, '')
  return /^[A-Z0-9]{2,10}$/.test(t) ? `${t}-EUR` : null
}

/** Rentabilidad en % a partir de céntimos; null si no hay nada aportado. */
export function gainPercent(gainCents: number, investedCents: number): number | null {
  if (investedCents <= 0) return null
  return (gainCents / investedCents) * 100
}
