/**
 * Reference implementation for the safe-money-handling skill.
 *
 * Copy what you need into your project's single money module and adapt the names.
 * No dependencies and no I/O: pure functions only. Amounts are integer minor units (cents).
 * Run the tests with: node --test reference/money.test.ts   (Node 22.18+ / 24)
 */

/** Upper bound per amount. Keeps cents far below Number.MAX_SAFE_INTEGER (2^53 - 1). */
export const MAX_MINOR = 100_000_000_000 // 1,000,000,000.00 in a 2-decimal currency

export type ParseResult =
  | { ok: true; minor: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'negative' | 'too-many-decimals' | 'too-large' }

/**
 * Parses what a user typed into integer minor units, without float arithmetic.
 *
 * Accepts "12", "12,5", "12.50", "1.234,56", "1,234.56", "1 234,56", "12,50 €", "$12.50".
 * - Both separators present: the LAST one is the decimal separator.
 * - One separator followed by groups of exactly three digits ("1.500", "1,500,000"):
 *   treated as thousands. This is a deliberate, documented rule; change it in one place
 *   only if your users expect otherwise.
 * - More than `decimals` fractional digits is rejected, never silently rounded.
 * - Negative input is rejected: users type positive amounts and the server applies the sign.
 */
export function parseAmountToMinor(input: unknown, decimals = 2): ParseResult {
  let text = String(input ?? '')
    .normalize('NFKC')
    .replace(/[\s  ']/g, '')
    .replace(/[€$£¥]/g, '')
    .replace(/(?<=\d)[A-Z]{3}$/i, '') // trailing ISO code: "12.50EUR"
  if (text === '') return { ok: false, reason: 'empty' }
  if (text.startsWith('-')) return { ok: false, reason: 'negative' }
  if (text.startsWith('+')) text = text.slice(1)

  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  let intPart: string
  let fracPart = ''

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSep = lastComma > lastDot ? ',' : '.'
    const groupSep = decimalSep === ',' ? '.' : ','
    const [i, f, ...rest] = text.split(decimalSep)
    // The integer part must be correctly grouped: "1.234,56" yes, "12.34,56" no.
    if (rest.length > 0 || !new RegExp(`^\\d{1,3}(\\${groupSep}\\d{3})*$`).test(i)) {
      return { ok: false, reason: 'invalid' }
    }
    intPart = i.split(groupSep).join('')
    fracPart = f
  } else if (lastComma !== -1 || lastDot !== -1) {
    const sep = lastComma !== -1 ? ',' : '.'
    // "0,004" is not thousands: a leading zero group means decimals.
    const groupedThousands = new RegExp(`^[1-9]\\d{0,2}(\\${sep}\\d{3})+$`)
    if (groupedThousands.test(text)) {
      intPart = text.split(sep).join('')
    } else {
      const parts = text.split(sep)
      if (parts.length !== 2) return { ok: false, reason: 'invalid' }
      ;[intPart, fracPart] = parts
    }
  } else {
    intPart = text
  }

  if (intPart === '') intPart = '0'
  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(fracPart)) return { ok: false, reason: 'invalid' }
  if (fracPart.length > decimals) return { ok: false, reason: 'too-many-decimals' }

  const minorBig = BigInt(intPart) * 10n ** BigInt(decimals) + BigInt(fracPart.padEnd(decimals, '0') || '0')
  if (minorBig > BigInt(MAX_MINOR)) return { ok: false, reason: 'too-large' }
  return { ok: true, minor: Number(minorBig) }
}

/** Formats integer minor units for display. Only ever call this at the UI edge. */
export function formatMinor(minor: number, currency: string, locale: string, decimals = 2): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 10 ** decimals)
}

export type EntryKind = 'income' | 'expense' | 'investment' | null | undefined

/**
 * The server decides the sign. Whatever the client sent, the stored value is
 * |amount| for income and -|amount| for everything else, including an unknown kind.
 */
export function applySign(minor: number, kind: EntryKind): number {
  const abs = Math.abs(minor)
  return kind === 'income' ? abs : -abs
}

/** Integer division rounding half away from zero (both operands may be BigInt). */
function divRound(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n
  const n = numerator < 0n ? -numerator : numerator
  const d = denominator < 0n ? -denominator : denominator
  const q = (2n * n + d) / (2n * d)
  return negative ? -q : q
}

/** Integer division rounding up (towards +infinity) for non-negative operands. */
function divCeil(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator
}

/**
 * Splits `total` into parts proportional to `weights` so that the parts ALWAYS add up
 * to `total` (largest-remainder method). Use it for shared bills, instalments,
 * allocations across funds… never `Math.round(total * share)` per part.
 */
export function allocate(total: number, weights: number[]): number[] {
  if (!Number.isInteger(total)) throw new Error('total must be integer minor units')
  if (weights.length === 0) return []
  if (weights.some((w) => !Number.isInteger(w) || w < 0)) throw new Error('weights must be non-negative integers')
  const sumW = weights.reduce((a, b) => a + b, 0)
  if (sumW === 0) throw new Error('weights must not all be zero')

  const T = BigInt(total)
  const W = BigInt(sumW)
  const exact = weights.map((w) => T * BigInt(w))
  const parts = exact.map((e) => e / W) // truncates towards zero
  let remainder = T - parts.reduce((a, b) => a + b, 0n)
  const step = remainder < 0n ? -1n : 1n
  const order = exact
    .map((e, i) => ({ i, rem: e % W < 0n ? -(e % W) : e % W }))
    .sort((a, b) => (b.rem === a.rem ? a.i - b.i : b.rem > a.rem ? 1 : -1))
  for (let k = 0; remainder !== 0n; k = (k + 1) % order.length) {
    parts[order[k].i] += step
    remainder -= step
  }
  return parts.map(Number)
}

/**
 * Tax withheld at source (interest, dividends…). The tax is rounded UP to the minor
 * unit, which is what many tax authorities and banks do; check your jurisdiction.
 * Invariant: gross === tax + net, always.
 * `ratePermille` avoids float rates: 19 % → 190, 21 % → 210, 19.5 % → 195.
 */
export function withholding(grossMinor: number, ratePermille: number) {
  if (grossMinor <= 0) return { gross: 0, tax: 0, net: 0 }
  const tax = Number(divCeil(BigInt(grossMinor) * BigInt(ratePermille), 1000n))
  return { gross: grossMinor, tax, net: grossMinor - tax }
}

/**
 * Interest accrued over a period from the END-OF-DAY balance of each day in it:
 * Σ max(balance, 0) × rate ÷ dayCount, rounded ONCE at the end (never per day).
 * `rateBasisPoints` avoids float rates: 2.25 % → 225, 3 % → 300.
 * `dayCount` is the convention of the product (ACT/365 → 365, ACT/360 → 360).
 */
export function accruedInterest(dailyBalancesMinor: number[], rateBasisPoints: number, dayCount = 365): number {
  const sum = dailyBalancesMinor.reduce((acc, b) => acc + BigInt(Math.max(b, 0)), 0n)
  return Number(divRound(sum * BigInt(rateBasisPoints), 10_000n * BigInt(dayCount)))
}

/**
 * Integer threshold check: does `spent` exceed `pct` % of `limit`? Strictly greater.
 * No division, no floats, exact at the boundary.
 */
export function exceedsPercent(spentMinor: number, limitMinor: number, pct: number): boolean {
  return BigInt(spentMinor) * 100n > BigInt(limitMinor) * BigInt(pct)
}
