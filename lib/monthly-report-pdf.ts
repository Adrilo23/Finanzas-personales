import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { parse } from 'date-fns'
import { formatCents } from '@/lib/money'
import { formatMonthYear, formatShortDate } from '@/lib/format'
import type { MonthlyReport } from '@/lib/monthly-report'

const INK: [number, number, number] = [15, 23, 42]

function pct(value: number | null, digits = 0): string {
  if (value === null) return '—'
  return `${(value * 100).toLocaleString('es-ES', { maximumFractionDigits: digits })} %`
}

function change(value: number | null): string {
  if (value === null) return 'sin mes anterior'
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded} % vs. mes anterior`
}

/** Genera el PDF del informe mensual. Solo texto y tablas (las fuentes base de jsPDF no llevan emojis). */
export function buildMonthlyReportPdf(report: MonthlyReport): ArrayBuffer {
  const month = parse(report.month, 'yyyy-MM', new Date(2000, 0, 1))
  const title = formatMonthYear(month)
  const doc = new jsPDF()
  const width = doc.internal.pageSize.getWidth()

  doc.setFontSize(18)
  doc.setTextColor(...INK)
  doc.text('Informe mensual', 14, 18)
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(title.charAt(0).toUpperCase() + title.slice(1), 14, 25)

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

  autoTable(doc, {
    ...common,
    startY: section('Resumen', 36),
    head: [['Concepto', 'Importe', 'Comparación']],
    body: [
      ['Ingresos', formatCents(report.totals.income), change(report.changes.income)],
      ['Gastos', formatCents(report.totals.expense), change(report.changes.expense)],
      ['Inversión', formatCents(report.totals.investment), change(report.changes.investment)],
      ['Balance', formatCents(report.balanceCents), `Tasa de ahorro: ${pct(report.savingsRate, 1)}`],
    ],
    columnStyles: { 1: { halign: 'right' } },
  })

  let y = lastY() + 10
  if (report.topCategories.length > 0) {
    autoTable(doc, {
      ...common,
      startY: section('Gasto por categoría', y),
      head: [['Categoría', 'Importe', '% del gasto']],
      body: report.topCategories.map((c) => [c.name, formatCents(c.cents), pct(c.share)]),
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
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
      columnStyles: { 3: { halign: 'right' } },
    })
    y = lastY() + 10
  }

  if (report.budgets.length > 0) {
    autoTable(doc, {
      ...common,
      startY: section('Presupuestos', y),
      head: [['Categoría', 'Gastado', 'Límite', 'Uso', 'Estado']],
      body: report.budgets.map((b) => [
        b.name,
        formatCents(b.spentCents),
        formatCents(b.budgetCents),
        pct(b.ratio),
        { ok: 'En margen', warning: 'Cerca del límite', over: 'Superado' }[b.status],
      ]),
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    })
    y = lastY() + 10
  }

  if (report.goals.length > 0) {
    autoTable(doc, {
      ...common,
      startY: section('Objetivos de ahorro (aportado este mes)', y),
      head: [['Objetivo', 'Aportación neta']],
      body: report.goals.map((g) => [g.name, formatCents(g.netCents)]),
      columnStyles: { 1: { halign: 'right' } },
    })
  }

  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.text('Los traspasos entre cuentas no cuentan como ingreso ni gasto.', 14, 288)
  doc.text(`Finanzas · ${title}`, width - 14, 288, { align: 'right' })

  return doc.output('arraybuffer')
}
