import { WifiOffIcon } from 'lucide-react'

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <WifiOffIcon aria-hidden className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Sin conexión</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Esta página no se había abierto antes, así que no está guardada en el dispositivo.
          Conéctate y vuelve a intentarlo, o abre una sección que ya hayas visitado: esas sí
          funcionan sin conexión.
        </p>
      </div>
    </main>
  )
}
