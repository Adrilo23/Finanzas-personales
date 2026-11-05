import { describe, expect, it } from 'vitest'
import { computeFirstSteps, firstStepsProgress } from './onboarding'

const none = { accounts: 0, transactions: 0, budgets: 0, recurring: 0, goals: 0 }

describe('computeFirstSteps', () => {
  it('sin uso, ningún paso está hecho', () => {
    const steps = computeFirstSteps(none)
    expect(steps.map((s) => s.done)).toEqual([false, false, false, false, false, false])
    expect(firstStepsProgress(steps)).toEqual({ done: 0, total: 6 })
  })

  it('marca solo los pasos que el usuario ya ha hecho', () => {
    const steps = computeFirstSteps({ ...none, accounts: 2, budgets: 1 })
    expect(steps.filter((s) => s.done).map((s) => s.key)).toEqual(['account', 'budget'])
  })

  it('en escritorio no se pide instalar en el móvil', () => {
    const steps = computeFirstSteps(none, { platform: 'desktop', installed: false })
    expect(steps.map((s) => s.key)).not.toContain('install')
    expect(firstStepsProgress(steps)).toEqual({ done: 0, total: 5 })
  })

  it('la instalación queda hecha si se usó instalada en cualquier dispositivo', () => {
    for (const platform of ['ios', 'android'] as const) {
      const steps = computeFirstSteps(none, { platform, installed: true })
      expect(steps.find((s) => s.key === 'install')?.done).toBe(true)
    }
  })

  it('con todo el uso hecho, solo queda la instalación', () => {
    const steps = computeFirstSteps({ accounts: 1, transactions: 9, budgets: 1, recurring: 1, goals: 1 })
    expect(firstStepsProgress(steps)).toEqual({ done: 5, total: 6 })
    expect(steps.filter((s) => !s.done).map((s) => s.key)).toEqual(['install'])
  })
})
