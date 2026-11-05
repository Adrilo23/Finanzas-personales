---
name: safe-money-handling
description: Use when building or changing any feature that stores, parses, calculates, splits, taxes or displays money (transactions, balances, budgets, invoices, interest, reports, payouts). Enforces integer minor units, one conversion module, server-derived signs, a single rounding policy, splits that always add up, idempotent postings and mandatory tests for money, date and aggregate changes.
---

# Safe money handling

Apply these rules whenever code touches amounts of money. They prevent the usual bugs: floating-point drift, sign mix-ups, a cent lost in a split, a payment posted twice, and totals that silently disagree.

`reference/money.ts` has dependency-free implementations of the functions named below (parsing, signing, allocation, withholding, interest, thresholds), and `reference/money.test.ts` covers them (`node --test reference/money.test.ts`, Node 22.18+). Copy and adapt; don't add a library just for this.

**Permissions:** the skill itself only reads and edits your project's files. A shell is needed only for the optional step of running the reference tests.

## 1. Store integer minor units

- Persist amounts as integers in the smallest unit (cents), never as `float`/`double` or a JS `number` with decimals.
- Database column: `bigint` (`amount_cents`). Put the unit in the name so it is never ambiguous.
- Add, subtract and compare in cents. Aggregate in the database (`sum(amount_cents)`) rather than looping in the client.
- Store the currency next to the amount if you support more than one. Never add amounts in different currencies.
- Some drivers return `bigint` columns as strings. Convert them in one place, and cap amounts (see 3) so cents stay well below `Number.MAX_SAFE_INTEGER` (2^53 − 1). Use `BigInt` for intermediate products that could exceed it (balance × rate × days).
- Prices and quantities are not money: unit prices (4+ decimals) and fund units or crypto (8+ decimals) need their own `numeric` columns. Round to cents only when the result becomes an amount.

## 2. One module owns conversion

Create a single module (e.g. `lib/money.ts`) that is the only place allowed to convert between display units and cents:

- `parseAmountToMinor(text)`, `formatMinor(cents, currency, locale)` and, if you must, `toCents(number)` / `fromCents(cents)`.
- No other file multiplies or divides by 100. Search for `* 100` and `/ 100` when reviewing.
- Parse the user's **string** straight into integer cents (split on the decimal separator) rather than `Math.round(parseFloat(x) * 100)`: `0.29 * 100` is `28.999999999999996`.
- Parse locale input defensively: `"1.234,56"`, `"1,234.56"`, `"12,5"`, `"12 €"`. When both separators appear, the last one is the decimal separator.
- Pick one rule for a lone separator followed by exactly three digits (`"1.500"`): thousands or ambiguous. Use it everywhere and test it.
- Reject more than two decimals instead of rounding: `0,004` must not become a 0-cent entry.

## 3. Validate at the edge AND in the database

- In the input schema, an amount must be finite, strictly positive (or ≥ 0 for opening balances), have at most two decimals, and sit under a sane cap (e.g. 1,000,000,000.00).
- Repeat the critical rules as database constraints (`check (amount_cents <> 0)`, ownership of every foreign key). If clients can reach your database API directly (Supabase/PostgREST, Firebase, Hasura…), server-action validation alone is not enough.

## 4. The server decides the sign

- Users always type positive amounts. The server derives the sign from the entry type (income positive; expense, investment and unknown negative).
- Implement it as one pure function, `applySign(cents, kind)`, that takes `Math.abs` first, so the result never depends on what the client sent.
- An unknown or missing type falls back to a documented default (negative).
- A transfer between your own accounts is two linked rows (out and in) with no income or expense category. Every income/expense total, budget and report must ignore it, and a list without an account filter should show it once.

## 5. One rounding policy, applied once

- Round **once**, at a defined point, never per step or per day. Accrue interest from daily balances and round the period total, not each day (rounding daily can turn every day of a small balance into 0).
- Derived amounts must reconcile exactly. Compute one part and derive the other by subtraction: `tax = ceil(gross × rate)`, `net = gross − tax`. Then `gross = tax + net` always.
- Write the rounding direction down per case: half-up for interest, up for withholding tax where the authority does so, and so on. Check the rule with the real institution and test against a real statement (e.g. "13.76 gross − 2.62 tax = 11.14 net").
- Splitting an amount (shared bills, instalments, allocation across funds) uses largest-remainder `allocate(total, weights)`, so the parts **always** add up to the total. Never `Math.round(total * share)` per part.
- State the interest day-count convention (ACT/365, ACT/360) and keep rates as integers (basis points, per-mille) instead of floats.

## 6. Keep calculations pure and testable

- Separate fetching from computing: `getReport()` queries and delegates to `computeReport(rows)`, a pure function with no I/O.
- Derived balances belong in the database (a view or query), not recomputed ad hoc in the UI.
- Exclude soft-deleted rows everywhere (`deleted_at IS NULL`). Put that filter in one query helper or view so no report forgets it.
- Watch for silent truncation. Many APIs cap result sets (PostgREST `max_rows` defaults to 1000) without an error, and a yearly total over a truncated list is wrong without anyone noticing. Aggregate in SQL, or paginate with a stable order (`order by id`) until a short page comes back.

### Thresholds and percentages

Compare against limits with integers, not decimals. To test whether `spent` exceeds `pct` percent of `limit`, use `spent * 100 > limit * pct`. Compute a percentage only for display, once, at the edge. Decide whether the boundary is inclusive or exclusive ("exceeds 80 %" means strictly greater) and test the exact boundary values.

```ts
const exceedsPercent = (spent: number, limit: number, pct: number) => spent * 100 > limit * pct
const level = exceedsPercent(spent, limit, 100) ? 'over' : exceedsPercent(spent, limit, 80) ? 'warn' : 'ok'
```

## 7. Scheduled and generated postings are idempotent

Recurring entries, monthly interest and fees are often generated lazily (on page load, on a cron job, on a webhook retry), and two runs can overlap.

- **Claim the period before writing.** Use a conditional update such as `update … set next_run = :next where id = :id and next_run = :previous`, and only insert if a row came back. If the insert fails, give the claim back. Alternatively, a unique key on `(rule_id, period)` with `on conflict do nothing`.
- Generate every period that is due, not just one. An app opened after three months owes three postings.
- For monthly schedules, keep the anchor day (the 31st) separately. Otherwise the 31st drifts to the 28th after February.
- Do multi-row money movements (both legs of a transfer, a plan that moves cash and buys assets) in a single transaction or database function.

## 8. Dates

- Store booking dates as `date` (no time) and compute "today" in the user's timezone, not the server's.
- A month is `[first day, first day of next month)`. Don't use `<= 'YYYY-MM-31'`.
- Pin the timezone in tests (`TZ=Europe/Madrid`, or whichever applies) so month-end tests don't depend on the CI machine.

## 9. Tests are mandatory for money

Any change involving money, signs, dates or aggregates ships with tests. At minimum, cover:

- Parsing: separators, the lone-separator-plus-three-digits rule, too many decimals, empty, negative and invalid input, the cap.
- Float traps (`0.29`, `1.15`, `0.1 + 0.2`) and large values near the cap.
- Sign rules for each type, including a negative value sent by the client and the missing-type fallback.
- Splits whose parts add up to the total (e.g. 10.00 into 3 parts, 1 cent into 2 parts, negative totals).
- Tax and fee invariants (`gross = tax + net`) over a range of inputs, plus one case checked against a real statement.
- Thresholds at the exact boundary, just below and just above.
- Totals with zero rows, one row, mixed signs, soft-deleted rows and transfers.
- Date boundaries: month end, 31st-day schedules, leap years, several overdue periods at once.

## 10. Display

- Format only at the edge with `Intl.NumberFormat` and the user's locale.
- Use tabular (monospaced-digit) figures so columns of amounts align.
- Don't rely on colour alone for positive or negative: add a sign or icon.
- When showing a net amount, also show where it comes from ("13.76 gross − 2.62 withholding"), so users can reconcile it with their bank.

## Review checklist

- [ ] No float arithmetic on stored amounts; no `* 100` or `/ 100` outside the money module.
- [ ] User input parsed from the string, validated (finite, > 0, ≤ 2 decimals, capped) and re-checked by a DB constraint.
- [ ] Sign applied server-side from the type; transfers excluded from income and expense totals.
- [ ] One rounding point per calculation; derived parts reconcile (`gross = tax + net`, splits sum to the total).
- [ ] Soft-deleted rows excluded and result sets not silently truncated in every aggregate.
- [ ] Generated postings claim their period first (no duplicates under concurrency).
- [ ] Calculation extracted into a pure function with tests, timezone pinned.
- [ ] New columns named with their unit and typed as integers (or `numeric` for prices and quantities).
