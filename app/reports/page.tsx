import { getMonthlyEvolution } from '@/lib/reports'
import { EvolutionChart } from './evolution-chart'

export default async function ReportsPage() {
  const data = await getMonthlyEvolution()

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Evolución</h1>
        <p className="text-sm text-muted-foreground">Últimos 12 meses</p>
      </div>
      <EvolutionChart data={data} />
    </main>
  )
}
