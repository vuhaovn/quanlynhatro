'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

export type MonthStat = {
  month: number
  year: number
  electric: number
  water: number
  total: number
}

function fmtY(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.0', '')}tr`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

function fmtTooltip(v: number) {
  return v.toLocaleString('vi-VN') + 'đ'
}

const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']

interface StatsChartProps {
  data: MonthStat[]
  year?: number
  onYearChange?: (y: number) => void
}

export function StatsChart({ data, year: externalYear, onYearChange }: StatsChartProps) {
  const years = [...new Set(data.map((d) => d.year))].sort((a, b) => b - a)
  const [internalYear, setInternalYear] = useState<number>(years[0] ?? new Date().getFullYear())

  const selectedYear = externalYear ?? internalYear
  const setSelectedYear = onYearChange ?? setInternalYear

  const chartData = MONTHS.map((label, i) => {
    const month = i + 1
    const found = data.find((d) => d.year === selectedYear && d.month === month)
    return {
      name: label,
      'Tiền điện': found?.electric ?? 0,
      'Tiền nước': found?.water ?? 0,
      'Tổng thu': found?.total ?? 0,
    }
  })

  const hasData = chartData.some((d) => d['Tổng thu'] > 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Thống kê theo tháng
        </h2>
        {!externalYear && years.length > 1 && (
          <div className="flex gap-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedYear === y
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {!hasData ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Chưa có dữ liệu năm {selectedYear}
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <div style={{ minWidth: 360 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={fmtY}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  formatter={(value, name) => [fmtTooltip(Number(value)), name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Tiền điện" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Tiền nước" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Tổng thu" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
