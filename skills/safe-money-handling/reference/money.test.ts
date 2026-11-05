// Run with: node --test reference/money.test.ts   (Node 22.18+ / 24, no dependencies)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_MINOR,
  accruedInterest,
  allocate,
  applySign,
  exceedsPercent,
  parseAmountToMinor,
  withholding,
} from './money.ts'

const minor = (s: string) => {
  const r = parseAmountToMinor(s)
  return r.ok ? r.minor : r.reason
}

test('parses common formats into integer cents', () => {
  assert.equal(minor('12'), 1200)
  assert.equal(minor('12,5'), 1250)
  assert.equal(minor('12.50'), 1250)
  assert.equal(minor('0,01'), 1)
  assert.equal(minor(',5'), 50)
  assert.equal(minor('1.234,56'), 123456)
  assert.equal(minor('1,234.56'), 123456)
  assert.equal(minor('1 234,56'), 123456)
  assert.equal(minor('12,50 €'), 1250)
  assert.equal(minor('$12.50'), 1250)
  assert.equal(minor('12.50 EUR'), 1250)
})

test('no float drift', () => {
  assert.equal(minor('0.29'), 29) // 0.29 * 100 = 28.999999999999996 in floats
  assert.equal(minor('1.15'), 115) // 1.15 * 100 = 114.99999999999999
  assert.equal(minor('999.999.999,99'), 99_999_999_999)
})

test('lone separator plus three digits is thousands (documented rule)', () => {
  assert.equal(minor('1.500'), 150000)
  assert.equal(minor('1,500,000'), 150000000)
  assert.equal(minor('1.005'), 100500) // not 1.005 and not 1.00
  assert.equal(minor('1.5'), 150)
})

test('rejects instead of guessing', () => {
  assert.equal(minor(''), 'empty')
  assert.equal(minor('   '), 'empty')
  assert.equal(minor('-5'), 'negative')
  assert.equal(minor('12.345.6'), 'invalid')
  assert.equal(minor('12.34,56'), 'invalid')
  assert.equal(minor('1e3'), 'invalid')
  assert.equal(minor('abc'), 'invalid')
  assert.equal(minor('0,004'), 'too-many-decimals') // would round to 0 cents: reject
  assert.equal(minor('0,0045'), 'too-many-decimals')
  assert.equal(minor('12,345'), 12345_00) // thousands, not 12.345
  assert.equal(minor('1.000.000.000,01'), 'too-large')
  assert.equal(parseAmountToMinor(String(MAX_MINOR / 100)).ok, true)
})

test('sign comes from the kind, never from the client', () => {
  assert.equal(applySign(1250, 'income'), 1250)
  assert.equal(applySign(-1250, 'income'), 1250)
  assert.equal(applySign(1250, 'expense'), -1250)
  assert.equal(applySign(-1250, 'expense'), -1250)
  assert.equal(applySign(1250, 'investment'), -1250)
  assert.equal(applySign(1250, null), -1250)
  assert.equal(applySign(1250, undefined), -1250)
})

test('allocate: parts always add up to the total', () => {
  assert.deepEqual(allocate(1000, [1, 1, 1]), [334, 333, 333])
  assert.deepEqual(allocate(100, [1, 1, 1, 1, 1, 1]), [17, 17, 17, 17, 16, 16])
  assert.deepEqual(allocate(1, [1, 1]), [1, 0])
  assert.deepEqual(allocate(-1000, [1, 1, 1]), [-334, -333, -333])
  assert.deepEqual(allocate(10000, [70, 20, 10]), [7000, 2000, 1000])
  for (const [total, weights] of [
    [99_999, [3, 7, 11]],
    [1, [5, 5, 5, 5]],
    [MAX_MINOR, [1, 2, 3, 4, 5, 6, 7]],
  ] as const) {
    const parts = allocate(total, [...weights])
    assert.equal(parts.reduce((a, b) => a + b, 0), total)
  }
  assert.throws(() => allocate(10.5, [1]))
  assert.throws(() => allocate(10, [0, 0]))
})

test('withholding: tax rounded up, gross = tax + net', () => {
  // 13.76 gross at 19 % → 2.6144 → 2.62 tax, 11.14 net
  assert.deepEqual(withholding(1376, 190), { gross: 1376, tax: 262, net: 1114 })
  assert.deepEqual(withholding(100, 190), { gross: 100, tax: 19, net: 81 })
  assert.deepEqual(withholding(1, 190), { gross: 1, tax: 1, net: 0 })
  assert.deepEqual(withholding(0, 190), { gross: 0, tax: 0, net: 0 })
  for (let g = 1; g < 5000; g += 7) {
    const r = withholding(g, 195)
    assert.equal(r.tax + r.net, r.gross)
  }
})

test('accrued interest: daily balances, rounded once', () => {
  // 5,405.75 for 31 days at 3 % ACT/365 → 13.7735… → 13.77
  assert.equal(accruedInterest(Array(31).fill(540_575), 300), 1377)
  // 1,000.00 for one day at 3.65 % → 0.10; the overdrawn day adds nothing
  assert.equal(accruedInterest([100_000, -50_000], 365), 10)
  // rounding per day would give 0 for small balances; once-per-period does not
  assert.equal(accruedInterest(Array(30).fill(1_000), 200), 2) // 30 × 10.00 × 2 % ÷ 365 = 0.0164 → 0.02
  // huge balances stay exact
  assert.equal(accruedInterest(Array(366).fill(MAX_MINOR), 1_000, 366), 10_000_000_000)
})

test('threshold checks are exact at the boundary', () => {
  assert.equal(exceedsPercent(8000, 10000, 80), false)
  assert.equal(exceedsPercent(8001, 10000, 80), true)
  assert.equal(exceedsPercent(10000, 10000, 100), false)
  assert.equal(exceedsPercent(10001, 10000, 100), true)
  assert.equal(exceedsPercent(1, 0, 80), true)
})
