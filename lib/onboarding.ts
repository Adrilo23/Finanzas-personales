import type { InstallPlatform } from './install'

export type FirstStepKey = 'account' | 'transaction' | 'budget' | 'recurring' | 'goal' | 'install'

export type FirstStep = {
  key: FirstStepKey
  title: string
  text: string
  href: string
  done: boolean
}

export type UsageCounts = {
  accounts: number
  transactions: number
  budgets: number
  recurring: number
  goals: number
}

export type InstallInfo = {
  /** Dispositivo de la petición (por el user agent). En escritorio no se pide instalar. */
  platform: InstallPlatform
  /** Se ha usado instalada en algún dispositivo (queda en la cuenta, `user_metadata`). */
  installed: boolean
}

/**
 * Lista de primeros pasos del inicio. Cada paso se marca solo según lo que el usuario
 * ya ha creado. Parte pura (sin base de datos), para poder testearla.
 *
 * El paso «install» no sale en escritorio (habla del móvil) y se marca hecho en cuanto
 * la app se ha abierto instalada en cualquier dispositivo de la cuenta.
 */
export function computeFirstSteps(
  counts: UsageCounts,
  install: InstallInfo = { platform: 'android', installed: false }
): FirstStep[] {
  const steps: FirstStep[] = [
    {
      key: 'account',
      title: 'Crea una cuenta',
      text: 'Tu cuenta bancaria, una tarjeta o el efectivo.',
      href: '/accounts',
      done: counts.accounts > 0,
    },
    {
      key: 'transaction',
      title: 'Registra un movimiento',
      text: 'Un gasto o un ingreso; recuerda escribir siempre el importe en positivo.',
      href: '/transactions',
      done: counts.transactions > 0,
    },
    {
      key: 'budget',
      title: 'Pon un presupuesto',
      text: 'Un límite mensual en la categoría donde más gastas.',
      href: '/budgets',
      done: counts.budgets > 0,
    },
    {
      key: 'recurring',
      title: 'Añade un movimiento recurrente',
      text: 'Tu nómina, el alquiler o una suscripción: se registran solos.',
      href: '/recurring',
      done: counts.recurring > 0,
    },
    {
      key: 'goal',
      title: 'Crea un objetivo de ahorro',
      text: 'Un viaje, un fondo de emergencia… y sigue tu progreso.',
      href: '/goals',
      done: counts.goals > 0,
    },
    {
      key: 'install',
      title: 'Instálala en tu móvil',
      text: 'Tenla a mano como una app más. Te explicamos cómo en tu dispositivo.',
      href: '/help#instalar',
      done: install.installed,
    },
  ]
  return install.platform === 'desktop' ? steps.filter((s) => s.key !== 'install') : steps
}

export function firstStepsProgress(steps: FirstStep[]): { done: number; total: number } {
  return { done: steps.filter((s) => s.done).length, total: steps.length }
}
