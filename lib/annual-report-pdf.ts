import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCents } from '@/lib/money'
import { formatShortDate } from '@/lib/format'
import type { AnnualReport } from '@/lib/annual-report'

const INK: [number, number, number] = [15, 23, 42]

function pct(value: number | null, digits = 0): string {
  if (value === null) return '—'
  return `${(value * 100).toLocaleString('es-ES', { maximumFractionDigits: digits })} %`
}

function change(value: number | null): string {
  if (value === null) return '—'
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded} %`
}

/** PDF del informe anual. Solo texto y tablas (las fuentes base de jsPDF no llevan emojis). */
export function buildAnnualReportPdf(report: AnnualReport): ArrayBuffer {
  const doc = new jsPDF()
  const width = doc.internal.pageSize.getWidth()
  const prevLabel = report.partial ? `${report.year - 1} (mismo periodo)` : String(report.year - 1)

  doc.setFontSize(18)
  doc.setTextColor(...INK)
  doc.text(`Informe anual ${report.year}`, 14, 18)
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(
    report.partial ? `Año en curso, hasta el ${formatShortDate(report.through)}` : 'Año completo',
    14,
    25
  )

  const section = (text: string, y: number) => {
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    doc.text(text, 14, y)
    return y + 3
  }
  const lastY = () =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  const common = {
    styles: { fontSize: 9 },
    headStyles: { fillColor: INK },
    margin: { left: 14, right: 14 },
  }
  const right = { halign: 'right' as const }

  autoTable(doc, {
    ...common,
    startY: section('Resumen', 36),
    head: [['Concepto', String(report.year), prevLabel, 'Variación']],
    body: [
      ['Ingresos', formatCents(report.totals.income), formatCents(report.previous.income), change(report.changes.income)],
      ['Gastos', formatCents(report.totals.expense), formatCents(report.previous.expense), change(report.changes.expense)],
      ['Inversión', formatCents(report.totals.investment), formatCents(report.previous.investment), change(report.changes.investment)],
      ['Balance', formatCents(report.balanceCents), formatCents(report.previousBalanceCents), change(report.changes.balance)],
      ['Tasa de ahorro', pct(report.savingsRate, 1), pct(report.previousSavingsRate, 1), ''],
    ],
    columnStyles: { 1: right, 2: right, 3: right },
  })

  let y = lastY() + 10
  const months = report.partial
    ? report.months.filter((m) => m.key <= report.through.slice(0, 7))
    : report.months
  autoTable(doc, {
    ...common,
    startY: section('Mes a mes', y),
    head: [['Mes', 'Ingresos', 'Inversión', 'Gastos', 'Balance']],
    body: months.map((m) => [
      m.label,
      formatCents(m.income),
      formatCents(m.investment),
      formatCents(m.expense),
      formatCents(m.balance),
    ]),
    columnStyles: { 1: right, 2: right, 3: right, 4: right },
  })
  y = lastY() + 10

  if (report.categories.length > 0) {
    autoTable(doc, {
      ...common,
      startY: section('Gasto por categoría', y),
      head: [['Categoría', String(report.year), prevLabel, 'Variación', '% del gasto']],
      body: report.categories.map((c) => [
        c.name,
        formatCents(c.cents),
        formatCents(c.previousCents),
        c.previousCents > 0 ? change(c.change) : 'nuevo',
        pct(c.share),
      ]),
      columnStyles: { 1: right, 2: right, 3: right, 4: right },
    })
    y = lastY() + 10
  }

  if (report.topExpenses.length > 0) {
    autoTable(doc, {
      ...common,
      startY: section('Mayores gastos', y),
      head: [['Fecha', 'Descripción', 'Categoría', 'Importe']],
      body: report.topExpenses.map((e) => [
        formatShortDate(e.date),
        e.description,
        e.category,
        formatCents(e.cents),
      ]),
      columnStyles: { 3: right },
    })
    y = lastY() + 10
  }

  if (report.goals.length > 0) {
    autoTable(doc, {
      ...common,
      startY: section('Objetivos de ahorro (aportado en el año)', y),
      head: [['Objetivo', 'Aportación neta']],
      body: report.goals.map((g) => [g.name, formatCents(g.netCents)]),
      columnStyles: { 1: right },
    })
  }

  // Pie en todas las páginas (con 12 meses y muchas categorías ocupa más de una).
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(140)
    doc.text('Los traspasos entre cuentas no cuentan como ingreso ni gasto.', 14, 288)
    doc.text(`Finanzas · ${report.year} · ${i}/${pages}`, width - 14, 288, { align: 'right' })
  }

  return doc.output('arraybuffer')
}
