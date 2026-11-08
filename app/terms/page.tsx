import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, PageShell } from '@/components/page-header'
import { LegalBackLink, LegalSection as Section, legalLink as link, legalStrong as strong } from '@/components/legal-page'
import { formatLegalDate, LEGAL } from '@/lib/legal'

export const metadata: Metadata = { title: 'Términos de uso y aviso legal' }

export default async function TermsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <PageShell>
      {!user && <LegalBackLink />}
      <PageHeader
        title="Términos de uso y aviso legal"
        description="Las reglas básicas para usar la app y quién está detrás."
      />

      <div className="surface space-y-7 p-5 sm:p-6">
        <Section title="Quién es el titular">
          <p>
            Esta aplicación la ofrece <strong className={strong}>{LEGAL.ownerName}</strong>, a título
            particular. Contacto:{' '}
            <a href={`mailto:${LEGAL.contactEmail}`} className={link}>
              {LEGAL.contactEmail}
            </a>
            . El servicio es gratuito y no tiene, por ahora, fin comercial. Si eso cambia, estos
            datos se completarán con la identificación fiscal que exige la ley.
          </p>
        </Section>

        <Section title="Qué es la app">
          <p>
            Una herramienta para que registres tus ingresos y gastos y veas métricas sobre ellos.
            Todo lo que aparece lo has escrito tú: la app no se conecta a tu banco.
          </p>
          <p>
            <strong className={strong}>No es asesoramiento financiero, fiscal ni legal.</strong> Los
            informes, los avisos de presupuesto y las estimaciones (por ejemplo, la fecha en que
            llegarás a un objetivo o el interés de una cuenta) son orientativos y dependen de lo
            que hayas introducido. Los precios de fondos y criptomonedas vienen de un tercero y
            pueden tener retraso o errores: no los uses para decidir una operación.
          </p>
        </Section>

        <Section title="Tu cuenta y tu responsabilidad">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Tienes que ser mayor de 14 años y dar un correo que sea tuyo.</li>
            <li>
              Guarda tu contraseña y no la compartas: lo que se haga con tu sesión es
              responsabilidad tuya. Si sospechas que alguien ha entrado, cámbiala o escribe al
              contacto.
            </li>
            <li>
              Los datos que introduces y los adjuntos que subes son tuyos y respondes de ellos. No
              subas contenido ilegal ni que no tengas derecho a usar.
            </li>
            <li>
              No intentes acceder a datos de otras personas, saturar el servicio ni saltarte sus
              límites de seguridad.
            </li>
          </ul>
        </Section>

        <Section title="Disponibilidad y límites de responsabilidad">
          <p>
            La app se ofrece «tal cual», sin garantía de que esté siempre disponible ni libre de
            errores. Puede haber paradas, cambios o fallos. Haz copias de lo que te importe: puedes
            descargar tus movimientos en Excel o PDF desde{' '}
            <Link href="/transactions" className={link}>
              Movimientos
            </Link>
            .
          </p>
          <p>
            En la medida que permite la ley, el titular no responde de los daños indirectos ni de
            decisiones que tomes a partir de lo que muestra la app. Esto no limita los derechos que
            la ley te reconoce como consumidor.
          </p>
        </Section>

        <Section title="Tus datos">
          <p>
            Cómo se tratan tus datos, quién los procesa y cómo ejercer tus derechos está en la{' '}
            <Link href="/privacy" className={link}>
              política de privacidad
            </Link>
            . Puedes borrar tu cuenta y todo lo asociado en cualquier momento desde{' '}
            <Link href="/settings" className={link}>
              Tu cuenta
            </Link>
            .
          </p>
        </Section>

        <Section title="Propiedad intelectual">
          <p>
            El código, el diseño y los textos de la app son de su titular. Tus datos siguen siendo
            tuyos. Las marcas que se nombran (Supabase, Vercel, Resend, Yahoo…) son de sus
            propietarios.
          </p>
        </Section>

        <Section title="Cambios y baja">
          <p>
            Estos términos pueden cambiar; si el cambio es relevante, se avisará en la app. Seguir
            usándola después supone aceptarlos. Puedes dejar de usar la app cuando quieras, y el
            titular puede suspender una cuenta que incumpla estas reglas.
          </p>
        </Section>

        <Section title="Ley aplicable">
          <p>
            Se rige por la ley española. Si eres consumidor, puedes acudir a los juzgados de tu
            domicilio y, para reclamaciones sobre tus datos, a la Agencia Española de Protección de
            Datos.
          </p>
        </Section>

        <p className="text-xs text-muted-foreground">
          Última revisión: {formatLegalDate(LEGAL.updated)}.
        </p>
      </div>
    </PageShell>
  )
}
