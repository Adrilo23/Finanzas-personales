export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-2">
        <h1 className="text-2xl font-semibold">Sin conexión</h1>
        <p className="text-muted-foreground">
          No tienes conexión a internet y esta página todavía no se había cargado antes.
          Conéctate y vuelve a intentarlo, o visita una sección que ya hayas abierto antes —
          esa sí estará disponible offline.
        </p>
      </div>
    </main>
  )
}
