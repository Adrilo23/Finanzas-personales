import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/login/actions'
import { processRecurringRules } from '@/lib/recurring'

export async function AppNav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  await processRecurringRules(user.id)

  return (
    <header className="border-b">
      <nav className="max-w-2xl mx-auto flex items-center justify-between p-4">
        <div className="flex gap-4 text-sm">
          <Link href="/">Inicio</Link>
          <Link href="/accounts">Cuentas</Link>
          <Link href="/categories">Categorías</Link>
          <Link href="/transactions">Movimientos</Link>
          <Link href="/recurring">Recurrentes</Link>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm text-muted-foreground underline">
            Cerrar sesión
          </button>
        </form>
      </nav>
    </header>
  )
}
