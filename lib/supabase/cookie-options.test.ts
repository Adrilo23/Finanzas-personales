import { describe, expect, it } from 'vitest'
import { withSessionFlags } from './cookie-options'

describe('withSessionFlags', () => {
  it('fuerza HttpOnly y SameSite=Lax', () => {
    expect(withSessionFlags({ httpOnly: false, sameSite: 'none', path: '/' })).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  })

  it('respeta maxAge 0 para que cerrar sesión borre la cookie', () => {
    expect(withSessionFlags({ maxAge: 0 }).maxAge).toBe(0)
  })

  it('funciona sin opciones', () => {
    expect(withSessionFlags(undefined).httpOnly).toBe(true)
  })
})
