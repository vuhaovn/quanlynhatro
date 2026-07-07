'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Zap, Droplets } from 'lucide-react'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { StatsChart, MonthStat } from '../../_components/stats-chart'

export type ZoneDetail = {
  year: number
  month: number
  zone: number | null
  count: number
  paidTotal: number
  unpaidTotal: number
  electric: number
  water: number
  total: number
  kwh: number
  m3: number
}

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

interface Props {
  chartData: MonthStat[]
  details: MonthDetail[]
  zones: ZoneDetail[]
}

export function StatisticsView({ chartData, details, zones }: Props) {
  const years = [...new Set(details.map((d) => d.year))].sort((a, b) => b - a)
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear())

  // Tháng gần nhất có dữ liệu khu trong 1 năm (0 nếu không có)
  const latestZoneMonth = (y: number) =>
    zones.reduce((max, z) => (z.year === y && z.month > max ? z.month : max), 0)

  // 0 = cả năm, 1-12 = tháng cụ thể (áp dụng cho bảng "Theo khu") — mặc định tháng gần nhất
  const [zoneMonth, setZoneMonth] = useState(() => latestZoneMonth(years[0] ?? new Date().getFullYear()))

  const changeYear = (y: number) => {
    setYear(y)
    setZoneMonth(latestZoneMonth(y))
  }

  const yearDetails = details.filter((d) => d.year === year)

  // Gộp ZoneDetail (theo năm+tháng+khu) thành 1 dòng / khu theo tháng đang chọn
  const zoneRowMap: Record<string, ZoneDetail> = {}
  for (const z of zones) {
    if (z.year !== year) continue
    if (zoneMonth > 0 && z.month !== zoneMonth) continue
    const key = String(z.zone ?? 'x')
    if (!zoneRowMap[key]) zoneRowMap[key] = { ...z, month: 0 }
    else {
      const r = zoneRowMap[key]
      r.count += z.count
      r.paidTotal += z.paidTotal
      r.unpaidTotal += z.unpaidTotal
      r.electric += z.electric
      r.water += z.water
      r.total += z.total
      r.kwh += z.kwh
      r.m3 += z.m3
    }
  }
  const yearZones = Object.values(zoneRowMap).sort((a, b) => (a.zone ?? 0) - (b.zone ?? 0))
  const zonePaid   = yearZones.reduce((s, z) => s + z.paidTotal, 0)
  const zoneUnpaid = yearZones.reduce((s, z) => s + z.unpaidTotal, 0)
  const zoneMonths = [...new Set(zones.filter((z) => z.year === year).map((z) => z.month))].sort((a, b) => a - b)

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
              onClick={() => changeYear(y)}
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
            <p className="text-lg font-bold text-green-600">{fmt(paidTotal)}đ</p>
            <p className="text-xs text-muted-foreground">cả năm {year}</p>
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
            <p className="text-lg font-bold text-orange-600">{fmt(unpaidTotal)}đ</p>
            <p className="text-xs text-muted-foreground">cả năm {year}</p>
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
          <StatsChart data={chartData} year={year} onYearChange={changeYear} />
        </Card>
      )}

      {/* Zone breakdown table */}
      {zoneMonths.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">
                Theo khu — {zoneMonth > 0 ? `Tháng ${zoneMonth}/${year}` : `Cả năm ${year}`}
              </CardTitle>
              <Select
                value={zoneMonth.toString()}
                onValueChange={(v) => setZoneMonth(parseInt(v ?? '0'))}
              >
                <SelectTrigger className="h-8 w-28 shrink-0">
                  <span className="flex flex-1 text-left text-xs">
                    {zoneMonth > 0 ? `Tháng ${zoneMonth}` : 'Cả năm'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Cả năm</SelectItem>
                  {zoneMonths.map((m) => (
                    <SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-b bg-muted/40 text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Khu</th>
                  <th className="text-right px-3 py-2 font-medium">HĐ</th>
                  <th className="text-right px-3 py-2 font-medium">Điện</th>
                  <th className="text-right px-3 py-2 font-medium">Nước</th>
                  <th className="text-right px-3 py-2 font-medium">Đã thu</th>
                  <th className="text-right px-3 py-2 font-medium">Chưa thu</th>
                  <th className="text-right px-4 py-2 font-medium">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {yearZones.map((z) => (
                  <tr key={z.zone ?? 'x'} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{z.zone != null ? `Khu ${z.zone}` : 'Khác'}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-muted-foreground">{z.count}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-amber-600">
                      <div>{fmt(z.electric)}</div>
                      <div className="text-[10px] text-muted-foreground">{fmt(z.kwh)} kWh</div>
                    </td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-blue-600">
                      <div>{fmt(z.water)}</div>
                      <div className="text-[10px] text-muted-foreground">{fmt(z.m3)} m³</div>
                    </td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-green-700 font-medium">
                      {z.paidTotal > 0 ? fmt(z.paidTotal) : '—'}
                    </td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-orange-600">
                      {z.unpaidTotal > 0 ? fmt(z.unpaidTotal) : '—'}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-semibold">
                      {fmt(z.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5 text-xs">Tổng cộng</td>
                  <td className="text-right px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                    {yearZones.reduce((s, z) => s + z.count, 0)}
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs tabular-nums text-amber-600">
                    {fmt(yearZones.reduce((s, z) => s + z.electric, 0))}
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs tabular-nums text-blue-600">
                    {fmt(yearZones.reduce((s, z) => s + z.water, 0))}
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs tabular-nums text-green-700">
                    {fmt(zonePaid)}
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs tabular-nums text-orange-600">
                    {zoneUnpaid > 0 ? fmt(zoneUnpaid) : '—'}
                  </td>
                  <td className="text-right px-4 py-2.5 text-xs tabular-nums">
                    {fmt(zonePaid + zoneUnpaid)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
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
                        {d.paidTotal > 0 ? fmt(d.paidTotal) : '—'}
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-orange-600">
                        {d.unpaidTotal > 0 ? fmt(d.unpaidTotal) : '—'}
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums font-semibold">
                        {fmt(d.total)}
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
                    {fmt(paidTotal)}
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs tabular-nums text-orange-600">
                    {unpaidTotal > 0 ? fmt(unpaidTotal) : '—'}
                  </td>
                  <td className="text-right px-4 py-2.5 text-xs tabular-nums">
                    {fmt(paidTotal + unpaidTotal)}
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
