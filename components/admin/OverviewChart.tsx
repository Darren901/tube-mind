'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

interface OverviewChartProps {
  data: {
    name: string
    total: number
  }[]
}

export function OverviewChart({ data }: OverviewChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
          itemStyle={{ color: '#fff' }}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
        />
        <Bar
          dataKey="total"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
