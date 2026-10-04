import Link from 'next/link'
import { MailIcon } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'

export default function CheckEmailPage() {
  return (
    <AuthShell>
      <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        <MailIcon aria-hidden className="size-5" />
      </div>
      <h1 className="text-[1.75rem] font-semibold tracking-tight">Revisa tu email</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Te hemos enviado un enlace de confirmación. Ábrelo para activar tu cuenta y después
        inicia sesión. Si no lo ves, mira en la carpeta de spam.
      </p>
      <Button variant="outline" className="mt-8 w-full" size="lg" asChild>
        <Link href="/login">Volver a iniciar sesión</Link>
      </Button>
    </AuthShell>
  )
}
