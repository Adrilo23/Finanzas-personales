'use client'

import { useEffect, useState } from 'react'
import { detectPlatform, type InstallPlatform } from '@/lib/install'

const STORAGE_KEY = 'finanzas:installed'

/** Evento de Chrome/Edge (no estándar) que permite lanzar el diálogo de instalación. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari en iOS no implementa display-mode en versiones antiguas.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function readInstalledFlag() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function saveInstalledFlag() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Sin almacenamiento (modo privado): solo se sabrá mientras se use instalada.
  }
}

/**
 * Estado de instalación de la PWA en este dispositivo. El servidor no puede saberlo:
 * se marca como instalada si ahora mismo se usa como app (o se usó alguna vez en este
 * navegador) y, en Chrome/Edge, expone `install` para lanzar el diálogo nativo.
 * Antes de montar en el cliente, `platform` es null.
 */
export function useInstallState() {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null)
  const [installed, setInstalled] = useState(false)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const standalone = isStandalone()
    if (standalone) saveInstalledFlag()
    /* eslint-disable react-hooks/set-state-in-effect -- navigator y localStorage solo existen en el cliente */
    setPlatform(detectPlatform(navigator.userAgent, navigator.maxTouchPoints))
    setInstalled(standalone || readInstalledFlag())
    /* eslint-enable react-hooks/set-state-in-effect */

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      saveInstalledFlag()
      setInstalled(true)
      setPromptEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = promptEvent
    ? async () => {
        await promptEvent.prompt()
        const { outcome } = await promptEvent.userChoice
        setPromptEvent(null)
        if (outcome === 'accepted') {
          saveInstalledFlag()
          setInstalled(true)
        }
      }
    : null

  return { platform, installed, install }
}
