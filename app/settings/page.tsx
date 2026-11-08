import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, PageShell } from '@/components/page-header'
import { DeleteMyAccountButton } from './delete-my-account-button'

export const metadata: Metadata = { title: 'Tu cuenta' }

const link = 'font-medium text-foreground underline underline-offset-2 hover:text-brand'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <PageShell>
      <PageHeader title="Tu cuenta" description={user?.email} />

      <section className="surface space-y-3 p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.01em]">Tus datos</h2>
        <p className="text-sm text-muted-foreground">
          Puedes descargar tus movimientos en Excel o PDF desde{' '}
          <Link href="/transactions" className={link}>
            Movimientos
          </Link>
          , y los informes desde{' '}
          <Link href="/reports/annual" className={link}>
            Informes
          </Link>
          . Cómo se tratan tus datos está en la{' '}
          <Link href="/privacy" className={link}>
            política de privacidad
          </Link>
          .
        </p>
      </section>

      <section className="surface space-y-3 p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.01em]">Eliminar mi cuenta</h2>
        <p className="text-sm text-muted-foreground">
          Borra tu usuario y todo lo que has guardado, adjuntos incluidos. Es inmediato y no se
          puede deshacer.
        </p>
        <DeleteMyAccountButton />
      </section>
    </PageShell>
  )
}
