import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email no válido'),
  // Al entrar no se exige longitud: las cuentas anteriores pueden tener contraseñas más
  // cortas y no deben quedarse fuera. La longitud se exige al registrarse.
  password: z.string().min(1, 'Escribe tu contraseña'),
})

export const MIN_PASSWORD_LENGTH = 10

export const registerSchema = loginSchema
  .extend({
    password: z.string().min(MIN_PASSWORD_LENGTH, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
