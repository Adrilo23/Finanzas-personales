'use client'

import Link from 'next/link'
import { Popover } from 'radix-ui'
import { ArrowRightIcon, CircleHelpIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Ayuda contextual «?»: un botón pequeño que abre una explicación corta y enlaza a la
 * respuesta completa de /help. Solo en los puntos que confunden (roadmap, Fase 4).
 * Pinta su propio botón, así que se puede usar desde Server Components.
 */
export function HelpHint({
  label,
  helpId,
  children,
  className,
}: {
  /** Nombre accesible del botón: «Ayuda: …». */
  label: string
  /** Ancla de la pregunta en /help (p. ej. 'recurrentes'). */
  helpId?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        aria-label={`Ayuda: ${label}`}
        className={cn(
          'inline-grid size-5 shrink-0 translate-y-[0.1em] place-items-center rounded-full align-baseline text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 data-[state=open]:text-brand',
          className
        )}
      >
        <CircleHelpIcon aria-hidden className="size-4" strokeWidth={1.75} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 w-[min(20rem,calc(100vw-2rem))] origin-(--radix-popover-content-transform-origin) rounded-xl bg-popover p-3.5 text-[0.8125rem] leading-relaxed text-popover-foreground shadow-(--shadow-pop) outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.97]"
        >
          <div className="space-y-2">{children}</div>
          {helpId && (
            <Link
              href={`/help#${helpId}`}
              className="mt-2.5 inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
            >
              Más en la ayuda
              <ArrowRightIcon aria-hidden className="size-3.5" />
            </Link>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
