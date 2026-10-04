'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlyPoint } from '@/lib/reports'

// Orden validado para daltonismo: ingresos → inversión → gastos (barras contiguas).
const SERIES = [
  { key: 'ingresos', label: 'Ingresos', color: 'var(--chart-1)' },
  { key: 'inversion', label: 'Inversión', color: 'var(--chart-2)' },
  { key: 'gastos', label: 'Gastos', color: 'var(--chart-3)' },
] as const

const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const compact = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 })

type ChartTooltipProps = {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  label?: string | number
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  const point = payload?.[0]?.payload as MonthlyPoint | undefined
  if (!active || !point) return null
  return (
    <div className="min-w-44 rounded-xl bg-popover px-3 py-2.5 text-[0.8125rem] text-popover-foreground shadow-(--shadow-pop)">
      <p className="mb-1.5 font-medium capitalize">{label}</p>
      <dl className="grid gap-1">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-[3px]" style={{ background: s.color }} />
              {s.label}
            </dt>
            <dd className="num font-medium">{euro.format(point[s.key])}</dd>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1.5">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <span className="h-0.5 w-2.5 rounded-full bg-chart-4" />
            Balance
          </dt>
          <dd className="num font-semibold">{euro.format(point.balance)}</dd>
        </div>
      </dl>
    </div>
  )
}

export function EvolutionChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <figure className="surface p-4 sm:p-6">
      <figcaption className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-[0.9375rem] font-semibold">Por mes</span>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-muted-foreground">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3 rounded-full bg-chart-4" />
            Balance
          </li>
        </ul>
      </figcaption>

      <div className="-mx-2 h-72 sm:mx-0 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={8}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              tickFormatter={(value: string) => value.replace('.', '')}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              tickFormatter={(value: number) => `${compact.format(value)} €`}
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Tooltip
              content={(props) => <ChartTooltip {...props} />}
              cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
              isAnimationActive={false}
            />
            {SERIES.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={14}
                animationDuration={500}
              />
            ))}
            <Line
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke="var(--chart-4)"
              strokeWidth={2}
              strokeLinecap="round"
              dot={{ r: 3.5, fill: 'var(--chart-4)', stroke: 'var(--card)', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: 'var(--chart-4)', stroke: 'var(--card)', strokeWidth: 2 }}
              animationDuration={600}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
