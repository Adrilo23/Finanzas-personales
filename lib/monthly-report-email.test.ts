import { describe, expect, it } from 'vitest'
import { buildMonthlyReportEmail, escapeHtml } from './monthly-report-email'
import { computeMonthlyReport } from './monthly-report'

describe('escapeHtml', () => {
  it('escapa los caracteres con significado en HTML', () => {
    expect(escapeHtml(`<b>"Tom & Jerry's"</b>`)).toBe(
      '&lt;b&gt;&quot;Tom &amp; Jerry&#39;s&quot;&lt;/b&gt;'
    )
  })
})

describe('buildMonthlyReportEmail', () => {
  const report = computeMonthlyReport(
    new Date(2026, 8, 1),
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
        description: null,
        transaction_date: '2026-09-02',
        categories: { name: '<script>alert(1)</script>', type: 'expense', icon: null },
      },
    ],
    [],
    [],
    [],
    []
  )
  const email = buildMonthlyReportEmail(report, 'https://finanzas.example/')

  it('asunto con el mes, importes formateados y enlace al informe', () => {
    expect(email.subject).toBe('Tu informe de septiembre de 2026')
    expect(email.html).toContain('1100,00')
    expect(email.html).toContain('https://finanzas.example/reports/monthly?month=2026-09')
    expect(email.text).toContain('Balance del mes:')
  })

  it('escapa los nombres que escribe el usuario', () => {
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;')
  })
})
