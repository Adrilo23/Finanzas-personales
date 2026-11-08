import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, PageShell } from '@/components/page-header'
import { LegalBackLink, LegalSection as Section, legalLink as link, legalStrong as strong } from '@/components/legal-page'
import { formatLegalDate, LEGAL } from '@/lib/legal'

export const metadata: Metadata = { title: 'Privacidad' }

export default async function PrivacyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <PageShell>
      {!user && <LegalBackLink />}
      <PageHeader
        title="Privacidad"
        description="Qué datos guarda la app, para qué y cómo puedes controlarlos."
      />

      <div className="surface space-y-7 p-5 sm:p-6">
        <Section title="Quién es el responsable">
          <p>
            El responsable del tratamiento de tus datos es <strong className={strong}>{LEGAL.ownerName}</strong>,
            titular de esta aplicación. Puedes escribirle a{' '}
            <a href={`mailto:${LEGAL.contactEmail}`} className={link}>
              {LEGAL.contactEmail}
            </a>{' '}
            para cualquier duda o para ejercer tus derechos. Aquí tienes también los{' '}
            <Link href="/terms" className={link}>
              términos de uso y el aviso legal
            </Link>
            .
          </p>
        </Section>

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
            <li>
              Un contador de cuántas veces pides un informe por correo o una descarga, para evitar
              abusos. Guarda la acción y la hora, no su contenido.
            </li>
          </ul>
          <p>
            <strong className={strong}>No</strong> te pedimos credenciales de tu banco ni nos
            conectamos a él: todo lo que hay en la app lo has escrito tú.
          </p>
        </Section>

        <Section title="Para qué los usamos y con qué base legal">
          <p>
            Solo para que la app funcione: mostrarte tus saldos, informes y avisos. No hay
            publicidad, no vendemos ni cedemos tus datos y no los usamos para perfilarte.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className={strong}>Prestarte el servicio</strong> que has pedido al crear la
              cuenta (art. 6.1.b del Reglamento General de Protección de Datos, RGPD).
            </li>
            <li>
              <strong className={strong}>Seguridad de la app</strong>: limitar intentos de acceso
              fallidos y abusos (interés legítimo, art. 6.1.f RGPD).
            </li>
          </ul>
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
          <p>
            Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo;
            en ese caso se apoyan en las garantías que exige el RGPD (decisiones de adecuación o
            cláusulas contractuales tipo).
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Solo usamos las cookies de sesión necesarias para mantenerte conectado (los scripts del
            navegador no pueden leerlas). Son cookies técnicas imprescindibles para el servicio, por
            lo que la normativa (art. 22.2 de la LSSI-CE) no exige tu consentimiento y por eso no
            ves un aviso de cookies. No hay cookies de análisis ni de publicidad. En tu navegador se
            guardan, además, preferencias locales como ocultar la lista de primeros pasos, y la
            copia sin conexión de las páginas que ya has visto (se borra al cerrar sesión).
          </p>
        </Section>

        <Section title="Cuánto tiempo los conservamos">
          <p>
            Mientras tengas la cuenta. Los movimientos que borras desde la app dejan de mostrarse
            y se eliminan del todo cuando borras tu cuenta.
          </p>
        </Section>

        <Section title="Tus derechos">
          <p>Puedes acceder a tus datos, corregirlos, llevártelos, limitarlos y borrarlos:</p>
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
            <li>
              <strong className={strong}>Oposición y limitación del tratamiento</strong>: escribe
              al correo de contacto.
            </li>
          </ul>
          <p>
            Para cualquier petición, escribe a{' '}
            <a href={`mailto:${LEGAL.contactEmail}`} className={link}>
              {LEGAL.contactEmail}
            </a>
            . Si crees que tus datos no se tratan bien, puedes reclamar ante la Agencia Española de
            Protección de Datos (aepd.es).
          </p>
        </Section>

        <p className="text-xs text-muted-foreground">
          Última revisión: {formatLegalDate(LEGAL.updated)}.
        </p>
      </div>
    </PageShell>
  )
}
