'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Zap, Droplets } from 'lucide-react'
import { StatsChart, MonthStat } from '../../_components/stats-chart'

export type MonthDetail = {
  month: number
  year: number
  count: number
  paidCount: number
  unpaidCount: number
  paidTotal: number
  unpaidTotal: number
  electric: number
  water: number
  total: number
  kwh: number
  m3: number
}

function fmt(v: number) { return v.toLocaleString('vi-VN') }
function fmtShort(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.0', '')}tr`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

interface Props {
  chartData: MonthStat[]
  details: MonthDetail[]
}

export function StatisticsView({ chartData, details }: Props) {
  const years = [...new Set(details.map((d) => d.year))].sort((a, b) => b - a)
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear())

  const yearDetails = details.filter((d) => d.year === year)

  const paidTotal    = yearDetails.reduce((s, d) => s + d.paidTotal, 0)
  const unpaidTotal  = yearDetails.reduce((s, d) => s + d.unpaidTotal, 0)
  const totalKwh     = yearDetails.reduce((s, d) => s + d.kwh, 0)
  const totalM3      = yearDetails.reduce((s, d) => s + d.m3, 0)

  const MONTH_NAMES = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']

  return (
    <div className="space-y-5">
      {/* Year selector */}
      {years.length > 1 && (
        <div className="flex gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                year === y
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-green-600 font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Đã thu
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-bold text-green-600">{fmtShort(paidTotal)}đ</p>
            <p className="text-xs text-muted-foreground">{fmt(paidTotal)}đ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-orange-600 font-medium flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              Chưa thu
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-bold text-orange-600">{fmtShort(unpaidTotal)}đ</p>
            <p className="text-xs text-muted-foreground">{fmt(unpaidTotal)}đ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Điện tiêu thụ
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-bold text-amber-600">{fmt(totalKwh)} kWh</p>
            <p className="text-xs text-muted-foreground">cả năm {year}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5" />
              Nước tiêu thụ
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-bold text-blue-600">{fmt(totalM3)} m³</p>
            <p className="text-xs text-muted-foreground">cả năm {year}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="p-4">
          <StatsChart data={chartData} year={year} onYearChange={setYear} />
        </Card>
      )}

      {/* Monthly breakdown table */}
      {yearDetails.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm">Chi tiết từng tháng — {year}</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-b bg-muted/40 text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Tháng</th>
                  <th className="text-right px-3 py-2 font-medium">HĐ</th>
                  <th className="text-right px-3 py-2 font-medium">Đã thu</th>
                  <th className="text-right px-3 py-2 font-medium">Chưa thu</th>
                  <th className="text-right px-4 py-2 font-medium">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {MONTH_NAMES.map((label, i) => {
                  const d = yearDetails.find((r) => r.month === i + 1)
                  if (!d) return (
                    <tr key={i} className="border-b last:border-0 text-muted-foreground/40">
                      <td className="px-4 py-2">{label}</td>
                      <td className="text-right px-3 py-2">—</td>
                      <td className="text-right px-3 py-2">—</td>
                      <td className="text-right px-3 py-2">—</td>
                      <td className="text-right px-4 py-2">—</td>
                    </tr>
                  )
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{label}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-muted-foreground">
                        {d.count}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-green-700 font-medium">
                        {d.paidTotal > 0 ? fmtShort(d.paidTotal) : '—'}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-orange-600">
                        {d.unpaidTotal > 0 ? fmtShort(d.unpaidTotal) : '—'}
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums font-semibold">
                        {fmtShort(d.total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5 text-xs">Tổng cộng</td>
                  <td className="text-right px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                    {yearDetails.reduce((s, d) => s + d.count, 0)}
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs tabular-nums text-green-700">
                    {fmtShort(paidTotal)}
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs tabular-nums text-orange-600">
                    {unpaidTotal > 0 ? fmtShort(unpaidTotal) : '—'}
                  </td>
                  <td className="text-right px-4 py-2.5 text-xs tabular-nums">
                    {fmtShort(paidTotal + unpaidTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
