import { describe, expect, it } from 'vitest'
import { isPublicPath } from './public-paths'

describe('isPublicPath', () => {
  it('la landing, la demo, la ayuda y el acceso son públicas', () => {
    for (const path of ['/', '/demo', '/help', '/login', '/register', '/register/check-email', '/auth/callback', '/offline', '/privacy', '/terms']) {
      expect(isPublicPath(path)).toBe(true)
    }
  })

  it('«/» es exacta: no abre el resto de la app', () => {
    for (const path of ['/transactions', '/accounts', '/accounts/123', '/reports/monthly/export', '/goals']) {
      expect(isPublicPath(path)).toBe(false)
    }
  })

  it('un prefijo no abre rutas que solo empiezan igual', () => {
    expect(isPublicPath('/helpdesk')).toBe(false)
    expect(isPublicPath('/demolition')).toBe(false)
    expect(isPublicPath('/login-admin')).toBe(false)
  })
})
