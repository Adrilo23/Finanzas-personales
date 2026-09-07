'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { MonthlyPoint } from '@/lib/reports'

export function EvolutionChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border p-4">
      <ComposedChart
        width={720}
        height={360}
        data={data}
        margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
        <YAxis
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}€`}
          width={56}
        />
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(2)} €`}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
        <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="gastos" name="Gastos" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar
          dataKey="inversion"
          name="Inversión"
          fill="#2563eb"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
        <Line
          type="monotone"
          dataKey="balance"
          name="Balance"
          stroke="#0f172a"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </div>
  )
}
