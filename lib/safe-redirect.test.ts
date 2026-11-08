import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safe-redirect'

describe('safeNextPath', () => {
  it('deja pasar rutas internas, con consulta y fragmento', () => {
    expect(safeNextPath('/')).toBe('/')
    expect(safeNextPath('/transactions')).toBe('/transactions')
    expect(safeNextPath('/reports/monthly?month=2026-10')).toBe('/reports/monthly?month=2026-10')
  })

  it('sin valor vuelve al inicio', () => {
    expect(safeNextPath(null)).toBe('/')
    expect(safeNextPath(undefined)).toBe('/')
    expect(safeNextPath('')).toBe('/')
  })

  it('rechaza lo que apunta a otro sitio', () => {
    expect(safeNextPath('@evil.com')).toBe('/')
    expect(safeNextPath('.evil.com')).toBe('/')
    expect(safeNextPath('https://evil.com')).toBe('/')
    expect(safeNextPath('//evil.com')).toBe('/')
    expect(safeNextPath('/\\evil.com')).toBe('/')
    expect(safeNextPath('javascript:alert(1)')).toBe('/')
  })

  it('rechaza caracteres de control', () => {
    expect(safeNextPath('/ok\r\nSet-Cookie: a=b')).toBe('/')
  })

  it('el resultado, resuelto contra el origen, nunca cambia de origen', () => {
    for (const raw of ['@evil.com', '//evil.com', '/\\evil.com', '/a/../../b', '/%2f%2fevil.com']) {
      expect(new URL(safeNextPath(raw), 'https://app.example').origin).toBe('https://app.example')
    }
  })
})
