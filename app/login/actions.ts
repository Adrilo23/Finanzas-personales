'use server'

import { createClient } from '@/lib/supabase/server'
import { loginSchema, registerSchema } from '@/lib/validation/auth-schemas'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { clientIp, throttleKeys, throttleMessage } from '@/lib/login-throttle'

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: 'Datos no válidos' }
  }

  const supabase = await createClient()
  const keys = throttleKeys(clientIp(await headers()), parsed.data.email)

  // Si el limitador falla (p. ej. la BD no responde), no se bloquea el login: se registra.
  const { data: blockedFor, error: statusError } = await supabase.rpc('login_throttle_status', {
    p_keys: keys,
  })
  if (statusError) console.error('login_throttle_status', statusError.message)
  if (blockedFor && blockedFor > 0) return { error: throttleMessage(blockedFor) }

  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    if (error.code === 'invalid_credentials') {
      const { data: nowBlocked, error: failError } = await supabase.rpc('login_throttle_fail', {
        p_keys: keys,
      })
      if (failError) console.error('login_throttle_fail', failError.message)
      if (nowBlocked && nowBlocked > 0) return { error: throttleMessage(nowBlocked) }
      // Mismo mensaje exista o no la cuenta: no revela qué emails están registrados.
      return { error: 'Email o contraseña incorrectos' }
    }
    if (error.code === 'email_not_confirmed') {
      return { error: 'Confirma tu email con el enlace que te enviamos antes de entrar' }
    }
    if (error.status === 429) {
      return { error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' }
    }
    return { error: 'No se ha podido iniciar sesión. Inténtalo de nuevo.' }
  }

  redirect('/')
}

export async function register(formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // El origen sale de la petición: así el enlace de confirmación apunta siempre
  // al dominio desde el que se registró el usuario (producción o local).
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  const siteUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/register/check-email')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
