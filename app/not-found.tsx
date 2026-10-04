import Link from 'next/link'
import { CompassIcon } from 'lucide-react'
import { PageShell } from '@/components/page-header'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <CompassIcon aria-hidden className="size-5" />
        </div>
        <p className="num text-sm font-medium text-muted-foreground">Error 404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">Esta página no existe</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Puede que el enlace esté mal escrito o que la página se haya movido.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </PageShell>
  )
}
