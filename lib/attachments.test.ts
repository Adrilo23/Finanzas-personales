import { describe, expect, it } from 'vitest'
import { attachmentPath, isOwnAttachmentPath, safeFileName, validateAttachmentFile } from './attachments'

const user = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const tx = '33333333-3333-4333-8333-333333333333'

describe('validateAttachmentFile', () => {
  it('acepta imágenes y PDF de hasta 10 MB', () => {
    expect(validateAttachmentFile({ type: 'application/pdf', size: 1024 })).toBeNull()
    expect(validateAttachmentFile({ type: 'image/webp', size: 10 * 1024 * 1024 })).toBeNull()
  })

  it('rechaza otros tipos (HTML, SVG), vacíos y demasiado grandes', () => {
    expect(validateAttachmentFile({ type: 'text/html', size: 10 })).not.toBeNull()
    expect(validateAttachmentFile({ type: 'image/svg+xml', size: 10 })).not.toBeNull()
    expect(validateAttachmentFile({ type: 'image/png', size: 0 })).not.toBeNull()
    expect(validateAttachmentFile({ type: 'image/png', size: 10 * 1024 * 1024 + 1 })).not.toBeNull()
  })
})

describe('safeFileName / attachmentPath', () => {
  it('quita carpetas, saltos y caracteres raros', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd')
    expect(safeFileName('C:\\fotos\\ticket mercadona.jpg')).toBe('ticket-mercadona.jpg')
    expect(safeFileName('.htaccess')).toBe('htaccess')
    expect(safeFileName('%2e%2e')).toBe('2e2e')
    expect(safeFileName('')).toBe('archivo')
  })

  it('la ruta generada siempre es propia', () => {
    const path = attachmentPath(user, tx, 'uuid', '../../otro/../x.pdf')
    expect(path).toBe(`${user}/${tx}/uuid-x.pdf`)
    expect(isOwnAttachmentPath(path, user, tx)).toBe(true)
  })
})

describe('isOwnAttachmentPath', () => {
  it('rechaza rutas de otro usuario, otro movimiento o con saltos', () => {
    expect(isOwnAttachmentPath(`${other}/${tx}/a.pdf`, user, tx)).toBe(false)
    expect(isOwnAttachmentPath(`${user}/${other}/a.pdf`, user, tx)).toBe(false)
    expect(isOwnAttachmentPath(`${user}/${tx}/../../${other}/a.pdf`, user, tx)).toBe(false)
    expect(isOwnAttachmentPath(`${user}/${tx}/%2e%2e`, user, tx)).toBe(false)
    expect(isOwnAttachmentPath(`${user}/${tx}/sub/a.pdf`, user, tx)).toBe(false)
    expect(isOwnAttachmentPath(`${user}/${tx}/`, user, tx)).toBe(false)
  })
})
