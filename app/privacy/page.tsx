import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, PageShell } from '@/components/page-header'

export const metadata: Metadata = { title: 'Privacidad' }

/**
 * Correo de contacto para ejercer derechos. Rellenar antes de abrir la app a terceros:
 * mientras esté vacío, la página no muestra ninguno.
 */
const CONTACT_EMAIL = ''

const link = 'font-medium text-foreground underline underline-offset-2 hover:text-brand'
const strong = 'text-foreground'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export default async function PrivacyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <PageShell>
      {!user && (
        <Link
          href="/"
          className="-mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          Inicio
        </Link>
      )}
      <PageHeader
        title="Privacidad"
        description="Qué datos guarda la app, para qué y cómo puedes controlarlos."
      />

      <div className="surface space-y-7 p-5 sm:p-6">
        <Section title="Qué datos guardamos">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Tu correo electrónico y tu contraseña (esta, cifrada: nadie puede leerla).</li>
            <li>
              Lo que tú introduces: cuentas, categorías, movimientos, presupuestos, objetivos,
              recurrentes, inversiones y los adjuntos (tickets y facturas) que subas.
            </li>
            <li>
              Para limitar los intentos de acceso, una huella irreversible (hash) de la dirección IP
              y del correo con el que alguien falla al entrar. No permite saber cuáles eran.
            </li>
          </ul>
          <p>
            <strong className={strong}>No</strong> te pedimos credenciales de tu banco ni nos
            conectamos a él: todo lo que hay en la app lo has escrito tú.
          </p>
        </Section>

        <Section title="Para qué los usamos">
          <p>
            Solo para que la app funcione: mostrarte tus saldos, informes y avisos. No hay
            publicidad, no vendemos ni cedemos tus datos y no los usamos para perfilarte.
          </p>
        </Section>

        <Section title="Quién los trata por nosotros">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className={strong}>Supabase</strong>: base de datos, acceso con usuario y
              almacenamiento de adjuntos. Cada usuario solo puede leer sus propias filas.
            </li>
            <li>
              <strong className={strong}>Vercel</strong>: alojamiento de la aplicación.
            </li>
            <li>
              <strong className={strong}>Resend</strong>: solo si pulsas «Envíamelo» en el informe
              mensual; recibe tu correo y el informe para entregártelo. Siempre a tu propia
              dirección.
            </li>
            <li>
              <strong className={strong}>Yahoo Finance</strong>: para actualizar precios de fondos
              y criptomonedas se consultan códigos de activo (ISIN o símbolo) desde el servidor. No
              se envía ningún dato tuyo.
            </li>
          </ul>
        </Section>

        <Section title="Cookies">
          <p>
            Solo usamos las cookies de sesión necesarias para mantenerte conectado (los scripts del
            navegador no pueden leerlas). No hay cookies de análisis ni de publicidad. En tu
            navegador se guardan, además, preferencias locales como ocultar la lista de primeros
            pasos.
          </p>
        </Section>

        <Section title="Cuánto tiempo los conservamos">
          <p>
            Mientras tengas la cuenta. Los movimientos que borras desde la app dejan de mostrarse
            y se eliminan del todo cuando borras tu cuenta.
          </p>
        </Section>

        <Section title="Tus derechos">
          <p>Puedes acceder a tus datos, corregirlos, llevártelos y borrarlos:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className={strong}>Acceso y portabilidad</strong>: descarga tus movimientos
              en Excel o PDF desde{' '}
              <Link href="/transactions" className={link}>
                Movimientos
              </Link>
              .
            </li>
            <li>
              <strong className={strong}>Rectificación</strong>: edita cualquier dato desde la
              propia app.
            </li>
            <li>
              <strong className={strong}>Supresión</strong>: en{' '}
              <Link href="/settings" className={link}>
                Tu cuenta
              </Link>{' '}
              puedes eliminar tu usuario y todo lo asociado, adjuntos incluidos, al instante.
            </li>
          </ul>
          <p>
            {CONTACT_EMAIL ? (
              <>
                Para cualquier otra petición o duda, escribe a{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
                  {CONTACT_EMAIL}
                </a>
                .{' '}
              </>
            ) : null}
            Si crees que tus datos no se tratan bien, puedes reclamar ante la Agencia Española de
            Protección de Datos (aepd.es).
          </p>
        </Section>
      </div>
    </PageShell>
  )
}
