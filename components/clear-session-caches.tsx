'use client'

import { useEffect } from 'react'

/**
 * Borra las cachés de páginas del service worker (movimientos, saldos…) al llegar a la
 * pantalla de login, que es donde se acaba tras cerrar sesión. Sin esto, en un dispositivo
 * compartido otra persona podría ver sin conexión las páginas guardadas del usuario anterior
 * (auditoría M1). El precaché de la app (`serwist-precache…`) se conserva: es solo código y
 * estáticos, sin datos.
 */
export function ClearSessionCaches() {
  useEffect(() => {
    if (typeof caches === 'undefined') return
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.includes('precache')).map((key) => caches.delete(key)))
      )
      .catch(() => {
        // Sin acceso a Cache Storage no hay nada que limpiar.
      })
  }, [])

  return null
}
