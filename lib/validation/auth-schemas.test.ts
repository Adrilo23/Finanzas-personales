import { describe, expect, it } from 'vitest'
import { loginSchema, MIN_PASSWORD_LENGTH, registerSchema } from './auth-schemas'

const valid = {
  email: 'ana@example.com',
  password: 'una-clave-larga-1',
  confirmPassword: 'una-clave-larga-1',
  acceptTerms: true,
}

describe('registerSchema', () => {
  it('acepta un alta correcta', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('exige una contraseña de al menos 10 caracteres', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    expect(registerSchema.safeParse({ ...valid, password: short, confirmPassword: short }).success).toBe(false)
    const ok = 'a'.repeat(MIN_PASSWORD_LENGTH)
    expect(registerSchema.safeParse({ ...valid, password: ok, confirmPassword: ok }).success).toBe(true)
  })

  it('exige que las dos contraseñas coincidan', () => {
    expect(registerSchema.safeParse({ ...valid, confirmPassword: 'otra-distinta-123' }).success).toBe(false)
  })

  it('exige aceptar los términos y la privacidad', () => {
    const result = registerSchema.safeParse({ ...valid, acceptTerms: false })
    expect(result.success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, acceptTerms: undefined }).success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('no exige longitud: las cuentas antiguas con contraseñas cortas siguen entrando', () => {
    expect(loginSchema.safeParse({ email: 'ana@example.com', password: '123456' }).success).toBe(true)
  })

  it('pide la contraseña y un email válido', () => {
    expect(loginSchema.safeParse({ email: 'ana@example.com', password: '' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'no-es-email', password: 'x' }).success).toBe(false)
  })
})
