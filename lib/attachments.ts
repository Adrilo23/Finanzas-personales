/**
 * Reglas de los adjuntos (tickets y facturas). Lógica pura, para poder testearla; las
 * comparten el diálogo (aviso inmediato) y el servidor (decisión final).
 */

export const ATTACHMENT_MAX_MB = 10
export const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export function validateAttachmentFile(file: { type: string; size: number }): string | null {
  if (!ATTACHMENT_TYPES.includes(file.type)) {
    return 'Solo se admiten imágenes (JPG, PNG, WEBP) o PDF.'
  }
  if (!(file.size > 0) || file.size > ATTACHMENT_MAX_MB * 1024 * 1024) {
    return `El archivo no puede superar ${ATTACHMENT_MAX_MB} MB.`
  }
  return null
}

/** Nombre de archivo seguro para la ruta de Storage: sin barras, puntos iniciales ni rarezas. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
    .slice(-100)
  return cleaned || 'archivo'
}

/**
 * Convención de ruta {user_id}/{transaction_id}/{uuid}-{nombre}: la primera carpeta
 * es la que comprueban las políticas de Storage.
 */
export function attachmentPath(userId: string, transactionId: string, uuid: string, name: string) {
  return `${userId}/${transactionId}/${uuid}-${safeFileName(name)}`
}

/** La ruta es exactamente de este usuario y este movimiento, sin saltos de carpeta. */
export function isOwnAttachmentPath(path: string, userId: string, transactionId: string): boolean {
  const parts = path.split('/')
  return (
    parts.length === 3 &&
    parts[0] === userId &&
    parts[1] === transactionId &&
    parts[2].length > 0 &&
    !parts[2].startsWith('.') &&
    !path.includes('..') &&
    !path.includes('%')
  )
}
