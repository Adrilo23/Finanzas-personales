import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'

/** Estilos y piezas compartidas por las páginas legales (/privacy y /terms). */
export const legalLink = 'font-medium text-foreground underline underline-offset-2 hover:text-brand'
export const legalStrong = 'text-foreground'

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

/** Enlace de vuelta al inicio para quien llega sin sesión (con sesión ya hay navegación). */
export function LegalBackLink() {
  return (
    <Link
      href="/"
      className="-mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <ArrowLeftIcon aria-hidden className="size-4" />
      Inicio
    </Link>
  )
}
