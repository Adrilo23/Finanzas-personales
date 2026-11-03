---
name: safe-money-handling
description: Use when building or changing any feature that stores, calculates, parses or displays money in a web app (transactions, balances, budgets, reports, invoices). Enforces integer minor units, a single conversion module, server-derived signs and mandatory tests for money, date and aggregate changes.
---

# Safe money handling

Apply these rules whenever code touches amounts of money. They prevent the usual bugs: floating-point drift, sign mix-ups, and totals that silently disagree.

## 1. Store integer minor units

- Persist amounts as integers in the smallest unit (cents), never as `float`/`double`/`number` decimals.
- Database column: `bigint` (e.g. `amount_cents`). Name columns with the unit suffix so the unit is never ambiguous.
- Sum, subtract and compare in cents. Aggregate in SQL (`sum(amount_cents)`), not by looping floats in the client.
- Store the currency alongside the amount if you support more than one. Never add amounts of different currencies.

## 2. One module owns conversion

Create a single module (e.g. `lib/money.ts`) that is the only place allowed to convert between display units and cents:

- `toCents(value)`, `fromCents(cents)`, `formatCents(cents, currency)`, `parseUserInput(text)`.
- No other file multiplies or divides by 100. Search the codebase for `* 100` and `/ 100` when reviewing.
- Prefer parsing the user's decimal **string** straight into integer cents (split on the decimal separator) over `Math.round(x * 100)`. Float multiplication can misround values such as `1.005`. If you do use `Math.round`, do a single multiplication and round once.
- Parse locale input defensively: `"1.234,56"`, `"1,234.56"`, `"12,5"`, `"12 €"`. Treat the last separator as the decimal one when both kinds appear. Return an invalid result for anything else and let schema validation reject it.
- Decide and document how to treat a lone separator followed by exactly three digits (`"1.234"`): it is either thousands (1234) or ambiguous. Pick one rule for the whole app, test it, and never guess differently in different places. Reject more than two decimals instead of silently rounding.

## 3. The server decides the sign

- Users always type positive amounts. The server applies the sign from the transaction/category type (income positive, expense negative).
- Implement it as one pure function (`applySign(cents, type)`) using `Math.abs` first, so the result never depends on what the client sent.
- Never trust a client-provided sign. Validate the input as strictly positive, then sign it server-side.
- Unknown or missing type must fall back to a safe, documented default (for example, negative).

## 4. Keep calculations pure and testable

- Separate fetching from computing: `getReport()` queries the database and delegates to `computeReport(rows)`, a pure function with no I/O.
- Derived balances belong in the database (a view or query), not recomputed ad hoc in the UI.
- Soft-deleted rows must be excluded everywhere (`deleted_at IS NULL`). Put that filter in one query helper or view so no report forgets it.

### Thresholds and percentages

Compare against limits with integers, not decimals. To test whether `spent` exceeds `pct` percent of `limit`, use `spent * 100 > limit * pct`. Only compute a percentage for display, and do it once, at the edge (for example in basis points, rounded). Decide whether the boundary is inclusive or exclusive ("exceeds 80%" means strictly greater) and test the exact boundary values.

```js
const exceedsPercent = (spent, limit, pct) => spent * 100 > limit * pct
const level = exceedsPercent(spent, limit, 100) ? 'over'
  : exceedsPercent(spent, limit, 80) ? 'warn' : 'ok'
```

## 5. Tests are mandatory for money

Any change involving money, signs, dates or aggregates ships with tests. At minimum cover:

- Conversion round-trips and rounding edge cases (`0.1 + 0.2`, `1.005`, large values).
- Locale parsing: thousands vs decimal separators, the lone-separator-plus-three-digits case, empty and invalid input.
- Budget or limit thresholds at exactly the boundary, just below and just above.
- Sign rules for each type, including the missing-type fallback.
- Totals with zero rows, one row, mixed signs and soft-deleted rows.
- Date boundaries (month end, 31st-day schedules, timezone). Pin the test timezone.

## 6. Display

- Format only at the edge, with `Intl.NumberFormat`, using the user's locale.
- Use tabular (monospaced-digit) figures so columns of amounts align.
- Do not rely on colour alone for positive/negative: add a sign or icon.

## Review checklist

- [ ] No float arithmetic on stored amounts.
- [ ] No `* 100` or `/ 100` outside the money module.
- [ ] Sign applied server-side from the type; client input validated as positive.
- [ ] Soft-deleted rows excluded from every aggregate.
- [ ] Calculation extracted into a pure function with tests.
- [ ] New columns named with their unit and typed as integers.
