import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftIcon, ChevronDownIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, PageShell } from '@/components/page-header'
import { InstallGuide } from './install-guide'

export const metadata: Metadata = { title: 'Ayuda' }

const link = 'font-medium text-foreground underline underline-offset-2 hover:text-brand'

/** Preguntas reales de quien empieza a usar la app, en el orden en que suelen surgir. */
const FAQ: { id: string; question: string; answer: React.ReactNode }[] = [
  {
    id: 'importe-positivo',
    question: '¿Por qué escribo siempre el importe en positivo?',
    answer: (
      <>
        <p>
          Porque el signo lo pone la <strong>categoría</strong>: si eliges una categoría de gasto,
          el movimiento resta; si es de ingreso, suma. Así no hay que acordarse de poner el menos y
          es imposible registrar un gasto que sume por error.
        </p>
        <p>
          Si te equivocas de categoría, edita el movimiento y cámbiala: el signo se corrige solo.
        </p>
      </>
    ),
  },
  {
    id: 'tipos-movimiento',
    question: '¿Qué diferencia hay entre gasto, ingreso, inversión y traspaso?',
    answer: (
      <>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Gasto</strong>: dinero que se va (compra, factura, suscripción).
          </li>
          <li>
            <strong>Ingreso</strong>: dinero que entra (nómina, devolución, intereses).
          </li>
          <li>
            <strong>Inversión</strong>: dinero que sale de tus cuentas hacia algo que no llevas en
            la app. Cuenta aparte de los gastos en el inicio y en los informes.
          </li>
          <li>
            <strong>Traspaso</strong>: dinero que cambia de una cuenta tuya a otra (por ejemplo, del
            banco al bróker). Mueve los saldos, pero no es ni ingreso ni gasto, así que no cuenta
            en los totales ni en los presupuestos.
          </li>
        </ul>
        <p>
          Si tus fondos o criptomonedas están en una{' '}
          <Link href="/accounts" className={link}>
            cuenta de inversión
          </Link>{' '}
          de la app, lo que les mandas es un traspaso, no una inversión.
        </p>
      </>
    ),
  },
  {
    id: 'recurrentes',
    question: '¿Cómo funcionan los movimientos recurrentes?',
    answer: (
      <>
        <p>
          Una regla{' '}
          <Link href="/recurring" className={link}>
            recurrente
          </Link>{' '}
          (la nómina, el alquiler, una suscripción) crea el movimiento sola en cada fecha.
          Los movimientos se generan <strong>al abrir la app</strong>: si llevas días sin entrar,
          al volver aparecen todos los que tocaban, cada uno con su fecha.
        </p>
        <p>
          Si un mes el importe real es distinto, edita ese movimiento. Si cambia para siempre,
          edita la regla con el lápiz: solo afecta a los siguientes.
        </p>
      </>
    ),
  },
  {
    id: 'subcategorias',
    question: '¿Las subcategorías cuentan en el presupuesto de su categoría?',
    answer: (
      <p>
        Sí. Un presupuesto sobre «Comida» incluye lo que registres en sus subcategorías
        («Supermercado», «Restaurantes»…). Pon el límite en la categoría principal y usa las
        subcategorías solo para ver el detalle. Al llegar al 80 % el presupuesto aparece como
        «cerca del límite», y por encima del 100 %, como «superado».
      </p>
    ),
  },
  {
    id: 'corregir',
    question: '¿Cómo corrijo o borro un movimiento?',
    answer: (
      <p>
        En{' '}
        <Link href="/transactions" className={link}>
          Movimientos
        </Link>
        , toca la fila para editarla: puedes cambiar el importe, la fecha, la cuenta o la
        categoría. Para borrarlo, usa la papelera que hay a la derecha de la fila. Un traspaso se
        edita y se borra entero, con sus dos partes.
      </p>
    ),
  },
  {
    id: 'inversiones',
    question: '¿Cómo llevo mis fondos o criptomonedas?',
    answer: (
      <>
        <p>
          Crea una{' '}
          <Link href="/accounts" className={link}>
            cuenta
          </Link>{' '}
          de tipo <strong>Inversión</strong> y, dentro, añade cada activo: los fondos, por su ISIN
          (lo encontrarás en tu bróker), y las criptomonedas, por su código (BTC, ETH…). Después
          anota cada compra o venta con las participaciones exactas que te indique el bróker.
        </p>
        <p>
          La app consulta los precios sola cuando la abres (las criptomonedas, cada hora; los
          fondos, cada 6 horas) y calcula el valor y la rentabilidad. Los fondos publican un único valor liquidativo al día y suele
          llegar con un día hábil de retraso; es normal que no cambie durante el día.
        </p>
      </>
    ),
  },
  {
    id: 'objetivos',
    question: '¿Por qué un objetivo de ahorro no cambia el saldo de mis cuentas?',
    answer: (
      <p>
        Porque las aportaciones a un{' '}
        <Link href="/goals" className={link}>
          objetivo
        </Link>{' '}
        son una anotación tuya («este mes he apartado 100 € para el viaje»), no un movimiento. El
        dinero sigue en la cuenta donde esté, y así no se cuenta dos veces. La app te dice cuánto
        apartar al mes para llegar a la fecha y si vas a tiempo.
      </p>
    ),
  },
  {
    id: 'sin-conexion',
    question: '¿Puedo usarla sin conexión?',
    answer: (
      <p>
        Solo para consultar: puedes ver las páginas que ya hayas abierto. Para registrar o editar
        movimientos necesitas conexión, porque todo se guarda en la nube; así tienes los mismos
        datos en el móvil y en el ordenador.
      </p>
    ),
  },
]

export default async function HelpPage() {
  // Página pública: sin sesión no hay barra de navegación, así que se ofrece la vuelta.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <PageShell>
      {!user && (
        <Link
          href="/login"
          className="-mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          Iniciar sesión
        </Link>
      )}
      <PageHeader
        title="Ayuda"
        description="Cómo instalar la app y respuestas a las dudas más habituales."
      />

      <section id="instalar" aria-labelledby="instalar-titulo" className="scroll-mt-20">
        <div className="surface p-5 sm:p-6">
          <h2 id="instalar-titulo" className="mb-4 text-base font-semibold tracking-[-0.01em]">
            Instalar la app
          </h2>
          <InstallGuide />
        </div>
      </section>

      <section aria-labelledby="faq-titulo" className="space-y-3">
        <h2 id="faq-titulo" className="text-base font-semibold tracking-[-0.01em]">
          Preguntas frecuentes
        </h2>
        <div className="surface divide-y divide-border/60 px-5 sm:px-6">
          {FAQ.map((item) => (
            <details key={item.id} id={item.id} className="group scroll-mt-20">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-[0.9375rem] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDownIcon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <div className="space-y-2.5 pb-5 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
