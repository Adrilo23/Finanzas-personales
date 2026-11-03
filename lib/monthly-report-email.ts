import { parse } from 'date-fns'
import { formatCents } from '@/lib/money'
import { formatMonthYear } from '@/lib/format'
import type { MonthlyReport } from '@/lib/monthly-report'

/** Los nombres de categorías y objetivos los escribe el usuario: siempre escapados. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function pct(value: number | null): string {
  if (value === null) return '—'
  return `${(value * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`
}

function change(value: number | null): string {
  if (value === null) return ''
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded} % vs. mes anterior`
}

/**
 * Asunto, HTML y texto plano del correo del informe mensual (el PDF va adjunto).
 * Parte pura, para poder testearla. HTML sencillo con estilos en línea, que es lo que
 * aguantan los clientes de correo.
 */
export function buildMonthlyReportEmail(report: MonthlyReport, appUrl: string) {
  const month = parse(report.month, 'yyyy-MM', new Date(2000, 0, 1))
  const title = formatMonthYear(month)
  const reportUrl = `${appUrl.replace(/\/$/, '')}/reports/monthly?month=${report.month}`

  const rows: [string, number, number | null][] = [
    ['Ingresos', report.totals.income, report.changes.income],
    ['Gastos', report.totals.expense, report.changes.expense],
    ['Inversión', report.totals.investment, report.changes.investment],
  ]
  const top = report.topCategories.slice(0, 5)

  const td = 'padding:6px 0;border-bottom:1px solid #eee;'
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#faf9f7;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1917;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
  <p style="margin:0;color:#78716c;font-size:13px;">Informe mensual</p>
  <h1 style="margin:4px 0 16px;font-size:22px;">${escapeHtml(title.charAt(0).toUpperCase() + title.slice(1))}</h1>
  <p style="margin:0;color:#78716c;font-size:13px;">Balance del mes</p>
  <p style="margin:2px 0 4px;font-size:28px;font-weight:600;color:${report.balanceCents < 0 ? '#b91c1c' : '#1c1917'};">${formatCents(report.balanceCents)}</p>
  <p style="margin:0 0 20px;color:#78716c;font-size:13px;">Tasa de ahorro: ${pct(report.savingsRate)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${rows
      .map(
        ([label, cents, ch]) =>
          `<tr><td style="${td}">${label}</td><td style="${td}text-align:right;font-weight:600;">${formatCents(cents)}</td><td style="${td}text-align:right;color:#78716c;font-size:12px;">${change(ch)}</td></tr>`
      )
      .join('\n    ')}
  </table>
  ${
    top.length > 0
      ? `<h2 style="margin:24px 0 8px;font-size:15px;">Dónde más has gastado</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${top
      .map(
        (c) =>
          `<tr><td style="${td}">${escapeHtml(c.name)}</td><td style="${td}text-align:right;">${formatCents(c.cents)}</td><td style="${td}text-align:right;color:#78716c;font-size:12px;">${Math.round(c.share * 100)} %</td></tr>`
      )
      .join('\n    ')}
  </table>`
      : ''
  }
  <p style="margin:24px 0 0;font-size:14px;">Tienes el informe completo en el PDF adjunto o en <a href="${escapeHtml(reportUrl)}" style="color:#1c1917;">la app</a>.</p>
  <p style="margin:16px 0 0;color:#a8a29e;font-size:12px;">Los traspasos entre cuentas no cuentan como ingreso ni gasto.</p>
</div>
</body></html>`

  const text = [
    `Informe mensual · ${title}`,
    '',
    `Balance del mes: ${formatCents(report.balanceCents)} (tasa de ahorro: ${pct(report.savingsRate)})`,
    ...rows.map(([label, cents, ch]) => `${label}: ${formatCents(cents)}${ch === null ? '' : ` (${change(ch)})`}`),
    ...(top.length > 0
      ? ['', 'Dónde más has gastado:', ...top.map((c) => `- ${c.name}: ${formatCents(c.cents)}`)]
      : []),
    '',
    `Informe completo en el PDF adjunto o en ${reportUrl}`,
  ].join('\n')

  return { subject: `Tu informe de ${title}`, html, text }
}
