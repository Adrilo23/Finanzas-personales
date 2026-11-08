'use client'

import { useEffect, useState } from 'react'

export type KeyboardInset = { inset: number; visibleHeight: number | null }

/**
 * Alto que tapa el teclado en pantalla y alto visible que queda. Chrome en Android y
 * Safari en iOS no encogen la página al abrir el teclado: lo pintan encima, así que
 * algo pegado abajo (la hoja de los diálogos) queda tapado. `visualViewport` sí
 * refleja el teclado.
 */
export function useKeyboardInset(enabled = true): KeyboardInset {
  const [state, setState] = useState<KeyboardInset>({ inset: 0, visibleHeight: null })

  useEffect(() => {
    const vv = window.visualViewport
    if (!enabled || !vv) return
    let frame = 0
    const measure = () => {
      frame = 0
      const raw = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      // Por debajo de 80 px no es un teclado (barras del navegador que aparecen o desaparecen).
      const next = { inset: raw > 80 ? raw : 0, visibleHeight: Math.round(vv.height) }
      // Sin cambios no se vuelve a pintar: al enfocar un campo el navegador dispara varios
      // eventos seguidos y cada repintado movía la hoja.
      setState((prev) =>
        prev.inset === next.inset && prev.visibleHeight === next.visibleHeight ? prev : next
      )
    }
    // Un solo cálculo por fotograma aunque lleguen varios resize/scroll juntos.
    const update = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [enabled])

  return state
}
