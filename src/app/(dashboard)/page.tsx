import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DoorOpen, Users, FileText, AlertCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Room, Invoice } from '@/types/database'
import { StatsChart, MonthStat } from './_components/stats-chart'

type UnpaidInvoice = Invoice & { room: Pick<Room, 'name' | 'floor'> | null }

function roomLabel(room: UnpaidInvoice['room']) {
  if (!room) return '—'
  return room.floor ? `Khu ${room.floor} · ${room.name}` : room.name
}

function fmt(v: number) { return v.toLocaleString('vi-VN') }

export default async function DashboardPage() {
  const supabase = await createClient()

  const [roomsRes, invoicesRes, chartRes] = await Promise.all([
    supabase.from('rooms').select('*'),
    supabase
      .from('invoices')
      .select('*, room:rooms(name, floor)')
      .eq('is_paid', false)
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('invoices')
      .select('month, year, electric_total, water_total, total_amount, is_paid, room:rooms(floor)'),
  ])

  const rooms = (roomsRes.data ?? []) as Room[]
  const unpaidInvoices = (invoicesRes.data ?? []) as UnpaidInvoice[]

  const totalRooms = rooms.length
  const rentedRooms = rooms.filter((r) => r.status === 'rented').length
  const emptyRooms = totalRooms - rentedRooms

  const allInvoices = (chartRes.data ?? []) as unknown as {
    month: number
    year: number
    electric_total: number
    water_total: number
    total_amount: number
    is_paid: boolean
    room: { floor: number | null } | null
  }[]

  // Aggregate invoice data by month/year for chart
  const statsMap: Record<string, MonthStat> = {}
  for (const inv of allInvoices) {
    const key = `${inv.year}-${inv.month}`
    if (!statsMap[key]) statsMap[key] = { month: inv.month, year: inv.year, electric: 0, water: 0, total: 0 }
    statsMap[key].electric += inv.electric_total
    statsMap[key].water += inv.water_total
    statsMap[key].total += inv.total_amount
  }
  const chartData = Object.values(statsMap).sort((a, b) => a.year - b.year || a.month - b.month)

  // Tháng gần nhất có hóa đơn → bảng "Theo khu"
  let latest: { month: number; year: number } | null = null
  for (const inv of allInvoices) {
    if (!latest || inv.year > latest.year || (inv.year === latest.year && inv.month > latest.month)) {
      latest = { month: inv.month, year: inv.year }
    }
  }
  type ZoneRow = { zone: number | null; electric: number; water: number; unpaid: number; total: number }
  const zoneMap: Record<string, ZoneRow> = {}
  if (latest) {
    for (const inv of allInvoices) {
      if (inv.month !== latest.month || inv.year !== latest.year) continue
      const zone = inv.room?.floor ?? null
      const key = String(zone ?? 'x')
      if (!zoneMap[key]) zoneMap[key] = { zone, electric: 0, water: 0, unpaid: 0, total: 0 }
      const z = zoneMap[key]
      z.electric += inv.electric_total
      z.water    += inv.water_total
      z.total    += inv.total_amount
      if (!inv.is_paid) z.unpaid += inv.total_amount
    }
  }
  const zoneRows = Object.values(zoneMap).sort((a, b) => (a.zone ?? 0) - (b.zone ?? 0))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">Chào mừng trở lại!</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/rooms" className="block h-full">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <DoorOpen className="h-3.5 w-3.5" />
                Tổng phòng
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{totalRooms}</p>
              <p className="text-xs text-muted-foreground">{emptyRooms} phòng trống</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/rooms" className="block h-full">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Đang thuê
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-green-600">{rentedRooms}</p>
              <p className="text-xs text-muted-foreground">{emptyRooms} phòng trống</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/invoices" className="col-span-2">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-orange-200 bg-orange-50">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-orange-600 font-medium flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Hóa đơn chưa thu
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-orange-600">{unpaidInvoices.length}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats chart */}
      {chartData.length > 0 && (
        <Card className="p-4">
          <StatsChart data={chartData} />
        </Card>
      )}

      {/* Zone summary — latest month */}
      {latest && zoneRows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Theo khu — Tháng {latest.month}/{latest.year}
            </h2>
            <Link href="/statistics" className="text-xs text-primary flex items-center gap-0.5 hover:underline">
              Thống kê <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Khu</th>
                    <th className="text-right px-3 py-2 font-medium">Điện</th>
                    <th className="text-right px-3 py-2 font-medium">Nước</th>
                    <th className="text-right px-3 py-2 font-medium">Chưa thu</th>
                    <th className="text-right px-4 py-2 font-medium">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneRows.map((z) => (
                    <tr key={z.zone ?? 'x'} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">{z.zone != null ? `Khu ${z.zone}` : 'Khác'}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-amber-600">{fmt(z.electric)}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-blue-600">{fmt(z.water)}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-orange-600">
                        {z.unpaid > 0 ? fmt(z.unpaid) : '—'}
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums font-semibold">{fmt(z.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="px-4 py-2.5">Tổng cộng</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-amber-600">
                      {fmt(zoneRows.reduce((s, z) => s + z.electric, 0))}
                    </td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-blue-600">
                      {fmt(zoneRows.reduce((s, z) => s + z.water, 0))}
                    </td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-orange-600">
                      {fmt(zoneRows.reduce((s, z) => s + z.unpaid, 0))}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums">
                      {fmt(zoneRows.reduce((s, z) => s + z.total, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Thao tác nhanh</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/invoices/new">
            <Card className="hover:shadow-md transition-shadow cursor-pointer text-center py-4">
              <CardContent className="px-2">
                <FileText className="h-6 w-6 mx-auto mb-1.5 text-primary" />
                <p className="text-xs font-medium">Tạo hóa đơn</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/tenants/new">
            <Card className="hover:shadow-md transition-shadow cursor-pointer text-center py-4">
              <CardContent className="px-2">
                <Users className="h-6 w-6 mx-auto mb-1.5 text-primary" />
                <p className="text-xs font-medium">Thêm người thuê</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Unpaid invoices list */}
      {unpaidInvoices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cần thu tiền</h2>
            {unpaidInvoices.length > 5 && (
              <Link href="/invoices?filter=unpaid" className="text-xs text-primary flex items-center gap-0.5 hover:underline">
                Xem tất cả {unpaidInvoices.length} <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <Card className="overflow-hidden">
            {unpaidInvoices.slice(0, 5).map((invoice, i) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block">
                <div className={`flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors ${i > 0 ? 'border-t' : ''}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{roomLabel(invoice.room)}</p>
                    <p className="text-xs text-muted-foreground">Tháng {invoice.month}/{invoice.year}</p>
                  </div>
                  <p className="text-sm font-semibold text-orange-600 shrink-0 ml-3">
                    {invoice.total_amount.toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </Link>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
