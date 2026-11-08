import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnnualReport, parseYearParam } from '@/lib/annual-report'
import { buildAnnualReportPdf } from '@/lib/annual-report-pdf'
import { allowAction, TOO_MANY_REQUESTS } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autenticado', { status: 401 })
  if (!(await allowAction(supabase, 'export', 20, '10 minutes'))) {
    return new NextResponse(TOO_MANY_REQUESTS, { status: 429 })
  }

  const now = new Date()
  const year = parseYearParam(new URL(request.url).searchParams.get('year'), now)
  const report = await getAnnualReport(year, now)
  const pdf = Buffer.from(buildAnnualReportPdf(report))

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="informe-${year}.pdf"`,
      // Datos privados: ni el navegador ni un proxy intermedio deben guardarlos (auditoría F-06).
      'Cache-Control': 'private, no-store, max-age=0',
    },
  })
}
