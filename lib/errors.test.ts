import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GENERIC_ERROR, userError } from './errors'

describe('userError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('traduce los códigos de Postgres a mensajes en español', () => {
    expect(userError({ code: '23505', message: 'duplicate key value violates unique constraint "x"' })).toBe(
      'Ya existe un registro igual.'
    )
    expect(userError({ code: '42501', message: 'new row violates row-level security policy' })).toBe(
      'No tienes permiso para hacer esto.'
    )
    expect(userError({ code: '23514', message: 'check constraint' })).toBe('Algún valor no es válido.')
  })

  it('no filtra nombres de tablas ni de constraints', () => {
    const text = userError({ code: '23503', message: 'violates foreign key constraint "transactions_account_id_fkey"' })
    expect(text).not.toMatch(/transactions|fkey|constraint/)
  })

  it('un código desconocido usa el mensaje genérico o el que se pase', () => {
    expect(userError({ code: 'XX000', message: 'internal' })).toBe(GENERIC_ERROR)
    expect(userError({ message: 'raro' }, 'No se ha podido guardar')).toBe('No se ha podido guardar')
  })

  it('deja pasar solo los raise exception de nuestras funciones (P0001)', () => {
    expect(userError({ code: 'P0001', message: 'Plan no encontrado' })).toBe('Plan no encontrado')
  })

  it('registra el detalle en el servidor', () => {
    userError({ code: '23505', message: 'detalle' })
    expect(console.error).toHaveBeenCalledWith('[db]', '23505', 'detalle')
  })
})
