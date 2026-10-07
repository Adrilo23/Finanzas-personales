'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckIcon, XIcon } from 'lucide-react'
import type { FirstStep } from '@/lib/onboarding'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'finanzas:first-steps-dismissed'

/** Lista de primeros pasos del inicio. Se puede ocultar; la preferencia queda en este navegador. */
export function FirstSteps({ steps }: { steps: FirstStep[] }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe en el cliente
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // Sin almacenamiento (modo privado): se muestra siempre.
    }
  }, [])

  const done = steps.filter((s) => s.done).length
  if (dismissed || done === steps.length) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Ignorar: se ocultará solo hasta la próxima carga.
    }
  }

  return (
    <section aria-labelledby="primeros-pasos" className="surface p-5 sm:p-6">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h2 id="primeros-pasos" className="text-[0.9375rem] font-semibold">
            Primeros pasos
          </h2>
          <p className="text-[0.8125rem] text-muted-foreground">
            {done} de {steps.length} completados
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ocultar primeros pasos"
          className="-mt-1 -mr-1 grid size-8 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <XIcon aria-hidden className="size-4" />
        </button>
      </div>
      <ol className="mt-3 divide-y divide-border/60">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              href={step.href}
              className="flex items-center gap-3 rounded-lg py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full border',
                  step.done
                    ? 'border-transparent bg-positive-soft text-positive'
                    : 'border-border text-transparent'
                )}
              >
                <CheckIcon className="size-3.5" strokeWidth={2.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    step.done && 'text-muted-foreground line-through'
                  )}
                >
                  {step.title}
                  <span className="sr-only">{step.done ? ' (hecho)' : ' (pendiente)'}</span>
                </span>
                {!step.done && (
                  <span className="block text-[0.8125rem] text-muted-foreground">{step.text}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
