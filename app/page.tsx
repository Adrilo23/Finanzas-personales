import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Test de conexión Supabase</h1>
      {error ? (
        <p>No hay sesión activa (esto es normal, aún no hemos hecho login): {error.message}</p>
      ) : (
        <p>Conectado. Usuario: {JSON.stringify(data.user)}</p>
      )}
      <p>Si ves este mensaje sin errores de compilación, la conexión con Supabase está bien configurada.</p>
      <p>
        <Link href="/accounts">Ir a cuentas</Link>
        <Link href="/categories">Ir a categorías</Link>
      </p>
    </main>
  )
}
