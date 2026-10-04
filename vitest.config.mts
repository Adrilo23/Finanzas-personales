import { defineConfig } from 'vitest/config'

// Tests de lógica pura (dinero, presupuestos, recurrentes, informes): entorno node, sin DOM.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    // Fechas deterministas: los cálculos de mes dependen de la zona horaria.
    env: { TZ: 'Europe/Madrid' },
  },
})
