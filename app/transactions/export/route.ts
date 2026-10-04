import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/money'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export const runtime = 'nodejs'

type Row = {
  transaction_date: string
  description: string | null
  amount_cents: number
  currency: string
  accounts: { name: string }[] | { name: string } | null
  categories: { name: string; type: string }[] | { name: string; type: string } | null
}

function first<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId') || undefined
  const categoryId = searchParams.get('categoryId') || undefined
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const fileFormat = searchParams.get('format') === 'pdf' ? 'pdf' : 'xlsx'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('No autenticado', { status: 401 })
  }

  let query = supabase
    .from('transactions')
    .select(
      'transaction_date, description, amount_cents, currency, accounts(name), categories(name, type)'
    )
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })

  if (accountId) query = query.eq('account_id', accountId)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (from) query = query.gte('transaction_date', from)
  if (to) query = query.lte('transaction_date', to)

  const { data } = await query
  const rows = (data ?? []) as Row[]

  const headers = ['Fecha', 'Cuenta', 'Categoría', 'Descripción', 'Importe']
  const tableRows = rows.map((t) => {
    const account = first(t.accounts)
    const category = first(t.categories)
    return [
      t.transaction_date,
      account?.name ?? '',
      category?.name ?? '',
      t.description ?? '',
      formatCents(t.amount_cents, t.currency),
    ]
  })

  if (fileFormat === 'xlsx') {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...tableRows])
    worksheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 12 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="movimientos.xlsx"',
      },
    })
  }

  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('Movimientos', 14, 16)
  autoTable(doc, {
    head: [headers],
    body: tableRows,
    startY: 22,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42] },
  })
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="movimientos.pdf"',
    },
  })
}
