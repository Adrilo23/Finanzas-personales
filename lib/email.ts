/**
 * Envío de correo intercambiable. Hoy: Resend por su API REST (sin SDK).
 * Variables de entorno (solo servidor):
 * - RESEND_API_KEY: obligatoria para enviar.
 * - EMAIL_FROM: remitente, p. ej. "Finanzas <informes@tudominio.com>". Sin dominio
 *   verificado en Resend, el remitente de pruebas (onboarding@resend.dev) solo puede
 *   enviar al correo con el que se creó la cuenta de Resend.
 */
export type EmailAttachment = { filename: string; content: Buffer }

export type EmailMessage = {
  to: string
  subject: string
  html: string
  text: string
  attachments?: EmailAttachment[]
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('El envío por email no está configurado (falta RESEND_API_KEY)')
  }
}

const DEFAULT_FROM = 'Finanzas <onboarding@resend.dev>'

export const resendProvider: EmailProvider = {
  async send(message) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new EmailNotConfiguredError()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
        })),
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      // El cuerpo trae el motivo (p. ej. remitente no verificado); va al log, no al usuario.
      console.error('Resend', res.status, await res.text().catch(() => ''))
      throw new Error(`No se pudo enviar el correo (HTTP ${res.status})`)
    }
  },
}
