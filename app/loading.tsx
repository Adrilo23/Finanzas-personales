import { PageShell } from '@/components/page-header'

/** Esqueleto genérico mientras carga cualquier sección. */
export default function Loading() {
  return (
    <PageShell>
      <div role="status" aria-label="Cargando" className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded-md bg-muted/70" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="surface h-64 animate-pulse" />
          <div className="surface h-64 animate-pulse" />
        </div>
        <div className="surface divide-y divide-border/70">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="size-9 animate-pulse rounded-[10px] bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-2/5 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-muted/70" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
