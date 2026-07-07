import { createClient } from '@/lib/supabase/server'
import { BarChart2 } from 'lucide-react'
import { MonthStat } from '../_components/stats-chart'
import { StatisticsView, MonthDetail, ZoneDetail } from './_components/statistics-view'

export default async function StatisticsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('invoices')
    .select('month, year, electric_total, water_total, total_amount, is_paid, electric_start, electric_end, water_start, water_end, room:rooms(floor)')

  const invoices = (data ?? []) as unknown as {
    month: number
    year: number
    electric_total: number
    water_total: number
    total_amount: number
    is_paid: boolean
    electric_start: number
    electric_end: number
    water_start: number
    water_end: number
    room: { floor: number | null } | null
  }[]

  // Aggregate for chart (MonthStat)
  const chartMap: Record<string, MonthStat> = {}
  for (const inv of invoices) {
    const key = `${inv.year}-${inv.month}`
    if (!chartMap[key]) chartMap[key] = { month: inv.month, year: inv.year, electric: 0, water: 0, total: 0 }
    chartMap[key].electric += inv.electric_total
    chartMap[key].water   += inv.water_total
    chartMap[key].total   += inv.total_amount
  }
  const chartData = Object.values(chartMap).sort((a, b) => a.year - b.year || a.month - b.month)

  // Aggregate for detail table (MonthDetail)
  const detailMap: Record<string, MonthDetail> = {}
  for (const inv of invoices) {
    const key = `${inv.year}-${inv.month}`
    if (!detailMap[key]) detailMap[key] = {
      month: inv.month, year: inv.year,
      count: 0, paidCount: 0, unpaidCount: 0,
      paidTotal: 0, unpaidTotal: 0,
      electric: 0, water: 0, total: 0, kwh: 0, m3: 0,
    }
    const d = detailMap[key]
    d.count++
    d.electric += inv.electric_total
    d.water    += inv.water_total
    d.total    += inv.total_amount
    d.kwh      += Math.max(0, inv.electric_end - inv.electric_start)
    d.m3       += Math.max(0, inv.water_end - inv.water_start)
    if (inv.is_paid) { d.paidCount++;   d.paidTotal   += inv.total_amount }
    else             { d.unpaidCount++; d.unpaidTotal += inv.total_amount }
  }
  const details = Object.values(detailMap).sort((a, b) => a.year - b.year || a.month - b.month)

  // Aggregate per zone (ZoneDetail) — theo năm + tháng + khu, client tự gộp khi xem "Cả năm"
  const zoneMap: Record<string, ZoneDetail> = {}
  for (const inv of invoices) {
    const zone = inv.room?.floor ?? null
    const key = `${inv.year}-${inv.month}-${zone ?? 'x'}`
    if (!zoneMap[key]) zoneMap[key] = {
      year: inv.year, month: inv.month, zone,
      count: 0, paidTotal: 0, unpaidTotal: 0,
      electric: 0, water: 0, total: 0, kwh: 0, m3: 0,
    }
    const z = zoneMap[key]
    z.count++
    z.electric += inv.electric_total
    z.water    += inv.water_total
    z.total    += inv.total_amount
    z.kwh      += Math.max(0, inv.electric_end - inv.electric_start)
    z.m3       += Math.max(0, inv.water_end - inv.water_start)
    if (inv.is_paid) z.paidTotal   += inv.total_amount
    else             z.unpaidTotal += inv.total_amount
  }
  const zones = Object.values(zoneMap).sort((a, b) => a.year - b.year || a.month - b.month || (a.zone ?? 0) - (b.zone ?? 0))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-5 w-5" />
        <h1 className="text-xl font-bold">Thống kê</h1>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">Chưa có dữ liệu hóa đơn</p>
      ) : (
        <StatisticsView chartData={chartData} details={details} zones={zones} />
      )}
    </div>
  )
}
