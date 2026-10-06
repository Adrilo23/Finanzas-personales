import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { getMonthlyReport, parseMonthParam } from '@/lib/monthly-report'
import { buildMonthlyReportPdf } from '@/lib/monthly-report-pdf'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autenticado', { status: 401 })

  const month = parseMonthParam(new URL(request.url).searchParams.get('month'), new Date())
  const report = await getMonthlyReport(month)
  const pdf = Buffer.from(buildMonthlyReportPdf(report))

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="informe-${format(month, 'yyyy-MM')}.pdf"`,
    },
  })
}
