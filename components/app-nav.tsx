import { createClient } from '@/lib/supabase/server'
import { processRecurringRules } from '@/lib/recurring'
import { refreshStalePrices } from '@/lib/prices'
import { processAccountInterest } from '@/lib/interest'
import { NavLinks } from '@/components/nav-links'

export async function AppNav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Todos son perezosos: casi siempre no hay nada pendiente y no hacen trabajo.
  await Promise.all([
    processRecurringRules(user.id),
    refreshStalePrices(user.id),
    processAccountInterest(user.id),
  ])

  return <NavLinks email={user.email ?? ''} />
}
