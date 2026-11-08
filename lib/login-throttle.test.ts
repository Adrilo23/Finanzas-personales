import { describe, expect, it } from 'vitest'
import { clientIp, throttleKeys, throttleMessage } from './login-throttle'

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
})

describe('clientIp', () => {
  it('usa x-real-ip y, si no, la primera IP de x-forwarded-for', () => {
    expect(clientIp(headers({ 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.2.3.4')
    expect(clientIp(headers({ 'x-forwarded-for': '5.6.7.8, 10.0.0.1' }))).toBe('5.6.7.8')
    expect(clientIp(headers({}))).toBe('desconocida')
  })
})

describe('throttleKeys', () => {
  it('dos claves con el formato que acepta la base de datos', () => {
    const keys = throttleKeys('1.2.3.4', 'Ana@Example.com')
    expect(keys).toHaveLength(2)
    expect(keys[0]).toMatch(/^pair:[0-9a-f]{64}$/)
    expect(keys[1]).toMatch(/^ip:[0-9a-f]{64}$/)
  })

  it('el email no distingue mayúsculas ni espacios; la IP sí cambia la clave', () => {
    expect(throttleKeys('1.2.3.4', ' ana@example.com ')).toEqual(throttleKeys('1.2.3.4', 'ANA@example.com'))
    expect(throttleKeys('1.2.3.5', 'ana@example.com')[0]).not.toBe(throttleKeys('1.2.3.4', 'ana@example.com')[0])
  })

  it('con secreto las claves cambian y dependen de él (HMAC)', () => {
    const plain = throttleKeys('1.2.3.4', 'ana@example.com', undefined)
    const a = throttleKeys('1.2.3.4', 'ana@example.com', 'secreto-a')
    const b = throttleKeys('1.2.3.4', 'ana@example.com', 'secreto-b')
    expect(a[0]).toMatch(/^pair:[0-9a-f]{64}$/)
    expect(a).not.toEqual(plain)
    expect(a).not.toEqual(b)
    expect(throttleKeys('1.2.3.4', 'ana@example.com', 'secreto-a')).toEqual(a)
  })

  it('sin IP conocida solo hay clave de pareja, no la de IP compartida', () => {
    const keys = throttleKeys('desconocida', 'ana@example.com', undefined)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatch(/^pair:/)
  })

  it('no guarda la IP ni el email en claro', () => {
    expect(throttleKeys('1.2.3.4', 'ana@example.com').join()).not.toMatch(/1\.2\.3\.4|ana@/)
  })
})

describe('throttleMessage', () => {
  it('redondea hacia arriba y concuerda en número', () => {
    expect(throttleMessage(30)).toContain('1 minuto.')
    expect(throttleMessage(61)).toContain('2 minutos')
    expect(throttleMessage(900)).toContain('15 minutos')
  })
})
