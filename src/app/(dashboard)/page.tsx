import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DoorOpen, Users, FileText, AlertCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Room, Invoice } from '@/types/database'

type UnpaidInvoice = Invoice & { room: Pick<Room, 'name' | 'floor'> | null }

function roomLabel(room: UnpaidInvoice['room']) {
  if (!room) return '—'
  return room.floor ? `Khu ${room.floor} · ${room.name}` : room.name
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [roomsRes, invoicesRes] = await Promise.all([
    supabase.from('rooms').select('*'),
    supabase
      .from('invoices')
      .select('*, room:rooms(name, floor)')
      .eq('is_paid', false)
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
  ])

  const rooms = (roomsRes.data ?? []) as Room[]
  const unpaidInvoices = (invoicesRes.data ?? []) as UnpaidInvoice[]

  const totalRooms = rooms.length
  const rentedRooms = rooms.filter((r) => r.status === 'rented').length
  const emptyRooms = totalRooms - rentedRooms

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
