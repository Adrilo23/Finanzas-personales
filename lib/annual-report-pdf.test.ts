import { describe, expect, it } from 'vitest'
import { buildAnnualReportPdf } from './annual-report-pdf'
import { computeAnnualReport } from './annual-report'

const isPdf = (buffer: ArrayBuffer) =>
  new TextDecoder().decode(new Uint8Array(buffer).slice(0, 5)) === '%PDF-'

describe('buildAnnualReportPdf', () => {
  const now = new Date(2026, 10, 3)

  it('genera un PDF válido con datos, sin datos y para el año en curso', () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({
      amount_cents: -(1000 + i * 37),
      description: `Gasto ${i}`,
      transaction_date: `2025-${String((i % 12) + 1).padStart(2, '0')}-10`,
      categories: { name: `Categoría ${i % 15}`, type: 'expense', icon: null },
    }))
    const full = computeAnnualReport(2025, now, rows, rows.slice(0, 10), [
      { goal_id: 'g', amount_cents: 5000, savings_goals: { name: 'Viaje' } },
    ])
    expect(isPdf(buildAnnualReportPdf(full))).toBe(true)
    expect(isPdf(buildAnnualReportPdf(computeAnnualReport(2025, now, [], [], [])))).toBe(true)
    expect(isPdf(buildAnnualReportPdf(computeAnnualReport(2026, now, [], [], [])))).toBe(true)
  })
})
