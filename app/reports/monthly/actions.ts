'use server'

import { headers } from 'next/headers'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { getMonthlyReport, parseMonthParam } from '@/lib/monthly-report'
import { buildMonthlyReportPdf } from '@/lib/monthly-report-pdf'
import { buildMonthlyReportEmail } from '@/lib/monthly-report-email'
import { EmailNotConfiguredError, resendProvider } from '@/lib/email'

/**
 * Envía el informe del mes (resumen + PDF adjunto) al correo del usuario con sesión.
 * Solo a su propio correo: el destinatario no se recibe del cliente.
 */
export async function sendMonthlyReport(month: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'No autenticado' }

  const date = parseMonthParam(month, new Date())
  const report = await getMonthlyReport(date)
  if (!report.hasData) return { error: 'Este mes no tiene movimientos' }

  // El enlace del correo apunta al dominio desde el que se pidió (producción o local).
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  const appUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? '')

  const email = buildMonthlyReportEmail(report, appUrl)
  try {
    await resendProvider.send({
      to: user.email,
      ...email,
      attachments: [
        {
          filename: `informe-${format(date, 'yyyy-MM')}.pdf`,
          content: Buffer.from(buildMonthlyReportPdf(report)),
        },
      ],
    })
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) return { error: error.message }
    return { error: 'No se ha podido enviar el correo. Inténtalo de nuevo más tarde.' }
  }

  return { success: true, to: user.email }
}
