export type FirstStepKey = 'account' | 'transaction' | 'budget' | 'recurring' | 'goal'

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

/**
 * Lista de primeros pasos del inicio. Cada paso se marca solo según lo que el usuario
 * ya ha creado. Parte pura (sin base de datos), para poder testearla.
 */
export function computeFirstSteps(counts: UsageCounts): FirstStep[] {
  return [
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
  ]
}

export function firstStepsProgress(steps: FirstStep[]): { done: number; total: number } {
  return { done: steps.filter((s) => s.done).length, total: steps.length }
}
