import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_OPTIONS, withSessionFlags } from '@/lib/supabase/cookie-options'
import { buildCsp } from '@/lib/security-headers'

import { isPublicPath } from '@/lib/public-paths'

export async function proxy(request: NextRequest) {
  // CSP con nonce por petición: Next lo lee de la cabecera de la petición y lo pone en
  // sus propios <script> al renderizar (las páginas son dinámicas).
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp({
    nonce,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    isDev: process.env.NODE_ENV === 'development',
  })
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const next = () => NextResponse.next({ request: { headers: requestHeaders } })
  let supabaseResponse = next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // request.cookies.set actualiza la cabecera Cookie; se copia a la petición reenviada.
          const cookieHeader = request.headers.get('cookie')
          if (cookieHeader !== null) requestHeaders.set('cookie', cookieHeader)
          supabaseResponse = next()
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, withSessionFlags(options))
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  supabaseResponse.headers.set('Content-Security-Policy', csp)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|serwist|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
