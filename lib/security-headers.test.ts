import { describe, expect, it } from 'vitest'
import { buildCsp, STATIC_SECURITY_HEADERS } from './security-headers'

const directive = (csp: string, name: string) =>
  csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? ''

describe('buildCsp', () => {
  const csp = buildCsp({
    nonce: 'abc123',
    supabaseUrl: 'https://kwouosaoaeydipzavjdr.supabase.co',
    isDev: false,
  })

  it('scripts solo con nonce, sin unsafe-inline ni unsafe-eval en producción', () => {
    const scripts = directive(csp, 'script-src')
    expect(scripts).toContain("'nonce-abc123'")
    expect(scripts).toContain("'strict-dynamic'")
    expect(scripts).not.toContain('unsafe-inline')
    expect(scripts).not.toContain('unsafe-eval')
  })

  it('nadie puede enmarcar la app y no hay plugins', () => {
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directive(csp, 'object-src')).toBe("object-src 'none'")
    expect(csp).toContain('upgrade-insecure-requests')
  })

  it('permite conectar con Supabase (solo el origen)', () => {
    expect(directive(csp, 'connect-src')).toBe(
      "connect-src 'self' https://kwouosaoaeydipzavjdr.supabase.co"
    )
  })

  it('en desarrollo añade unsafe-eval y no fuerza https', () => {
    const dev = buildCsp({ nonce: 'n', supabaseUrl: undefined, isDev: true })
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'")
    expect(dev).not.toContain('upgrade-insecure-requests')
    expect(directive(dev, 'connect-src')).toBe("connect-src 'self'")
  })

  it('una URL de Supabase mal formada no rompe la política', () => {
    expect(() => buildCsp({ nonce: 'n', supabaseUrl: 'no es una url', isDev: false })).not.toThrow()
  })
})

describe('STATIC_SECURITY_HEADERS', () => {
  it('incluye las cabeceras pedidas por la auditoría', () => {
    const keys = STATIC_SECURITY_HEADERS.map((h) => h.key)
    expect(keys).toEqual(
      expect.arrayContaining(['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy'])
    )
  })
})
