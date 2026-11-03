'use client'

import { useState } from 'react'
import {
  CircleCheckIcon,
  DownloadIcon,
  EllipsisIcon,
  EllipsisVerticalIcon,
  MonitorDownIcon,
  ShareIcon,
  SquarePlusIcon,
} from 'lucide-react'
import type { InstallPlatform } from '@/lib/install'
import { useInstallState } from '@/components/use-install-state'
import { Segmented } from '@/components/ui/segmented'
import { Button } from '@/components/ui/button'

const PLATFORM_OPTIONS = [
  { value: 'ios', label: 'iPhone / iPad' },
  { value: 'android', label: 'Android' },
  { value: 'desktop', label: 'Ordenador' },
] as const

/** Icono dentro del texto de un paso, para reconocer el botón en pantalla. */
function Glyph({ icon: Icon, label }: { icon: typeof ShareIcon; label: string }) {
  return (
    <span className="mx-0.5 inline-flex translate-y-[0.15em] items-center rounded-md bg-muted p-0.5 text-foreground">
      <Icon aria-label={label} className="size-3.5" strokeWidth={2} />
    </span>
  )
}

const STEPS: Record<InstallPlatform, { intro: React.ReactNode; steps: React.ReactNode[] }> = {
  ios: {
    intro:
      'En iPhone no aparece ningún aviso para instalar: hay que añadirla a mano a la pantalla de inicio. Funciona desde Safari (y, desde iOS 16.4, también desde Chrome o Edge).',
    steps: [
      <>
        Abre esta página en <strong>Safari</strong>.
      </>,
      <>
        Toca el botón <strong>Compartir</strong> <Glyph icon={ShareIcon} label="Compartir" /> (el
        cuadrado con una flecha hacia arriba). Si no lo ves, está dentro del menú{' '}
        <Glyph icon={EllipsisIcon} label="Más" /> de la barra.
      </>,
      <>
        Baja por la lista y elige <strong>Añadir a pantalla de inicio</strong>{' '}
        <Glyph icon={SquarePlusIcon} label="Añadir" />. Si no aparece, toca «Ver más».
      </>,
      <>
        Deja activado <strong>Abrir como app web</strong> si te lo pregunta y toca{' '}
        <strong>Añadir</strong>.
      </>,
      <>
        Abre <strong>Finanzas</strong> desde el icono nuevo. La primera vez tendrás que iniciar
        sesión otra vez: la app instalada no comparte la sesión con Safari.
      </>,
    ],
  },
  android: {
    intro: 'Con Chrome, a veces aparece un aviso para instalarla; si no, hazlo desde el menú.',
    steps: [
      <>
        Abre esta página en <strong>Chrome</strong>.
      </>,
      <>
        Toca el menú <Glyph icon={EllipsisVerticalIcon} label="Menú" /> (arriba a la derecha).
      </>,
      <>
        Elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong> y
        confirma con <strong>Instalar</strong>.
      </>,
      <>
        La encontrarás en la pantalla de inicio y en el cajón de aplicaciones como{' '}
        <strong>Finanzas</strong>.
      </>,
    ],
  },
  desktop: {
    intro:
      'En Chrome y Edge se instala como una ventana propia, con su icono en el escritorio o en la barra de tareas.',
    steps: [
      <>
        En la barra de direcciones, a la derecha, pulsa el icono{' '}
        <Glyph icon={MonitorDownIcon} label="Instalar" /> <strong>Instalar</strong>.
      </>,
      <>
        Si no lo ves, abre el menú del navegador y busca <strong>Instalar Finanzas</strong> (en
        Chrome, dentro de «Enviar, guardar y compartir»; en Edge, en «Aplicaciones»).
      </>,
      <>
        En Safari para Mac: menú <strong>Archivo → Añadir al Dock</strong>.
      </>,
    ],
  },
}

export function InstallGuide() {
  const { platform, installed, install } = useInstallState()
  // Hasta saber el dispositivo se muestra la de iPhone, que es la que más se necesita.
  const [chosen, setChosen] = useState<InstallPlatform | null>(null)
  const current = chosen ?? platform ?? 'ios'
  const guide = STEPS[current]

  return (
    <div className="space-y-4">
      {installed && (
        <p className="flex items-start gap-2.5 rounded-xl bg-positive-soft px-3.5 py-3 text-sm text-positive">
          <CircleCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Ya tienes la app instalada en este dispositivo. Si quieres usarla en otro, sigue estos
            pasos desde él.
          </span>
        </p>
      )}

      {install && !installed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft px-3.5 py-3">
          <p className="text-sm">Tu navegador permite instalarla con un toque.</p>
          <Button size="sm" onClick={install}>
            <DownloadIcon aria-hidden />
            Instalar la app
          </Button>
        </div>
      )}

      <Segmented
        name="plataforma"
        aria-label="Dispositivo"
        value={current}
        onValueChange={setChosen}
        options={PLATFORM_OPTIONS}
      />

      <p className="text-sm leading-relaxed text-muted-foreground">{guide.intro}</p>

      <ol className="space-y-3">
        {guide.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span
              aria-hidden
              className="num grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold"
            >
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
