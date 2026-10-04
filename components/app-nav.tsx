import { createClient } from '@/lib/supabase/server'
import { processRecurringRules } from '@/lib/recurring'
import { NavLinks } from '@/components/nav-links'

export async function AppNav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  await processRecurringRules(user.id)

  return <NavLinks email={user.email ?? ''} />
}
