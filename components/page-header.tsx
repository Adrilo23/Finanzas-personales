import * as React from 'react'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight first-letter:uppercase">
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="contenido"
      className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 pt-6 pb-28 sm:px-6 sm:pt-10 lg:pb-16"
    >
      {children}
    </main>
  )
}
