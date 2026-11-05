'use client'

import { useEffect, useRef } from 'react'

/**
 * Deja en pausa las animaciones `.animate-ink` / `.animate-settle` de su interior hasta que
 * el bloque entra en pantalla (en móvil, la libreta queda bajo el primer pantallazo).
 * La pausa solo se aplica con JavaScript activo (`@media (scripting: enabled)` en
 * globals.css); sin él, todo se ve tal cual.
 */
export function RevealOnView({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      el.dataset.inview = ''
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Casi entera (en móvil la suma y el resumen quedan bajo el primer pantallazo),
        // o llenando media pantalla si la pantalla es más baja que el bloque.
        const enough =
          entry.intersectionRatio >= 0.75 || entry.intersectionRect.height >= window.innerHeight * 0.5
        if (!entry.isIntersecting || !enough) return
        el.dataset.inview = ''
        observer.disconnect()
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} data-reveal className={className}>
      {children}
    </div>
  )
}
