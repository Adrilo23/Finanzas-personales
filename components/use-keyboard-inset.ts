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
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      // Por debajo de 80 px no es un teclado (barras del navegador que aparecen o desaparecen).
      setState({ inset: inset > 80 ? inset : 0, visibleHeight: Math.round(vv.height) })
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [enabled])

  return state
}
