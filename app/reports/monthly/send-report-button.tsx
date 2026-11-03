'use client'

import { useState, useTransition } from 'react'
import { CheckIcon, MailIcon } from 'lucide-react'
import { sendMonthlyReport } from './actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** «Envíamelo»: manda el informe del mes con el PDF adjunto al correo de la sesión. */
export function SendReportButton({ month }: { month: string }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const send = () =>
    startTransition(async () => {
      setResult(null)
      const res = await sendMonthlyReport(month)
      setResult(
        'error' in res && res.error
          ? { ok: false, message: res.error }
          : { ok: true, message: `Enviado a ${'to' in res ? res.to : 'tu correo'}` }
      )
    })

  return (
    // El mensaje queda flotando bajo el botón para no descuadrar la fila de acciones.
    <div className="relative">
      <Button variant="outline" onClick={send} disabled={pending || result?.ok}>
        {result?.ok ? <CheckIcon data-icon="inline-start" /> : <MailIcon data-icon="inline-start" />}
        {pending ? 'Enviando…' : result?.ok ? 'Enviado' : 'Envíamelo'}
      </Button>
      <p
        role="status"
        className={cn(
          'absolute top-full right-0 z-10 mt-1.5 w-max max-w-64 text-right text-xs',
          result?.ok ? 'text-positive' : 'text-negative'
        )}
      >
        {result?.message}
      </p>
    </div>
  )
}
