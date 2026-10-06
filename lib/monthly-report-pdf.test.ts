import { describe, expect, it } from 'vitest'
import { buildMonthlyReportPdf } from './monthly-report-pdf'
import { computeMonthlyReport } from './monthly-report'

describe('buildMonthlyReportPdf', () => {
  it('genera un PDF válido con y sin datos', () => {
    const month = new Date(2026, 8, 1)
    const full = computeMonthlyReport(
      month,
      [
        {
          category_id: 'a',
          amount_cents: 150000,
          description: null,
          transaction_date: '2026-09-01',
          categories: { name: 'Nómina', type: 'income', icon: null },
        },
        {
          category_id: 'b',
          amount_cents: -40000,
          description: 'Alquiler piso',
          transaction_date: '2026-09-02',
          categories: { name: 'Alquiler', type: 'expense', icon: '🏠' },
        },
      ],
      [],
      [{ id: 'p', category_id: 'b', amount_cents: 45000, categories: { name: 'Alquiler', icon: null } }],
      [{ id: 'b', parent_id: null }],
      [{ goal_id: 'g', amount_cents: 5000, savings_goals: { name: 'Viaje' } }]
    )
    for (const report of [full, computeMonthlyReport(month, [], [], [], [], [])]) {
      const bytes = new Uint8Array(buildMonthlyReportPdf(report))
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    }
  })
})
