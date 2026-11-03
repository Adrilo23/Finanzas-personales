import { createServerClient } from '@supabase/ssr'
import type { Database } from './database.types'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_OPTIONS, withSessionFlags } from './cookie-options'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // HttpOnly/Secure siempre, aunque @supabase/ssr traiga otros valores.
              cookieStore.set(name, value, withSessionFlags(options))
            )
          } catch {
            // Se puede ignorar si se llama desde un Server Component.
            // Si tienes middleware refrescando la sesión, esto no da problema.
          }
        },
      },
    }
  )
}