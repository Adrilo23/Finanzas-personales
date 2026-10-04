import * as React from 'react'
import { BrandMark } from '@/components/brand-mark'

/** Pantallas públicas (login, registro…): panel de marca a la izquierda en escritorio. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main id="contenido" className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-[oklch(0.2_0.012_75)] p-10 text-[oklch(0.96_0.004_85)] lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_100%,oklch(0.55_0.11_160/0.35),transparent_70%),radial-gradient(40%_35%_at_0%_0%,oklch(0.6_0.05_85/0.12),transparent_70%)]"
        />
        <div className="relative flex items-center gap-2.5 text-[0.9375rem] font-semibold">
          <BrandMark className="[&_rect:first-child]:fill-[oklch(0.96_0.004_85)] [&_rect:nth-child(2)]:fill-[oklch(0.2_0.012_75/0.5)] [&_rect:nth-child(3)]:fill-[oklch(0.2_0.012_75/0.8)]" />
          Finanzas
        </div>

        <div className="relative mt-auto max-w-md">
          <p className="text-[2.5rem] leading-[1.08] font-semibold tracking-[-0.035em]">
            Sabes en qué se va cada euro.
          </p>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-[oklch(0.96_0.004_85/0.65)]">
            Registra ingresos, gastos e inversiones, guarda los tickets y mira cómo evoluciona
            tu balance mes a mes.
          </p>
        </div>

        <dl className="relative mt-12 grid grid-cols-3 gap-6 border-t border-[oklch(1_0_0/0.12)] pt-6 text-sm">
          {[
            ['Saldos', 'al día, por cuenta'],
            ['Recurrentes', 'se anotan solos'],
            ['Exporta', 'a Excel o PDF'],
          ].map(([title, text]) => (
            <div key={title}>
              <dt className="font-medium">{title}</dt>
              <dd className="mt-0.5 text-[oklch(0.96_0.004_85/0.55)]">{text}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <div className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center gap-2.5 text-[0.9375rem] font-semibold lg:hidden">
          <BrandMark />
          Finanzas
        </div>
        <div className="m-auto w-full max-w-sm py-10 animate-rise">{children}</div>
      </div>
    </main>
  )
}
