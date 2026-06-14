import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, DoorOpen } from 'lucide-react'
import Link from 'next/link'
import { Room } from '@/types/database'

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('rooms').select('*')
  const rooms = (data ?? []) as Room[]

  const sorted = [...rooms].sort((a, b) => {
    const za = a.floor ?? 0, zb = b.floor ?? 0
    if (za !== zb) return za - zb
    return a.name.localeCompare(b.name, 'vi', { numeric: true })
  })

  const zones: Record<string, Room[]> = {}
  for (const room of sorted) {
    const key = room.floor?.toString() ?? ''
    if (!zones[key]) zones[key] = []
    zones[key].push(room)
  }
  const zoneKeys = Object.keys(zones)

  const totalRented = rooms.filter((r) => r.status === 'rented').length
  const totalEmpty = rooms.length - totalRented

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Quản lý Phòng</h1>
        <Link href="/rooms/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Thêm
          </Button>
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DoorOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có phòng nào</p>
          <Link href="/rooms/new">
            <Button variant="outline" size="sm" className="mt-3">
              Thêm phòng đầu tiên
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card px-3 py-2 text-center">
              <p className="text-lg font-bold">{rooms.length}</p>
              <p className="text-xs text-muted-foreground">Tổng</p>
            </div>
            <div className="rounded-lg border bg-green-50 border-green-200 px-3 py-2 text-center">
              <p className="text-lg font-bold text-green-700">{totalRented}</p>
              <p className="text-xs text-green-600">Đang thuê</p>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2 text-center">
              <p className="text-lg font-bold text-muted-foreground">{totalEmpty}</p>
              <p className="text-xs text-muted-foreground">Trống</p>
            </div>
          </div>

          {/* Zone sections */}
          <div className="space-y-5">
            {zoneKeys.map((zoneKey) => {
              const zoneRooms = zones[zoneKey]
              const zoneRented = zoneRooms.filter((r) => r.status === 'rented').length
              return (
                <div key={zoneKey}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {zoneKey ? `Khu ${zoneKey}` : 'Chưa có khu'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {zoneRented}/{zoneRooms.length} đang thuê
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {zoneRooms.map((room) => (
                      <Link key={room.id} href={`/rooms/${room.id}`}>
                        <div className={`rounded-lg border p-2.5 transition-shadow hover:shadow-md cursor-pointer h-full ${
                          room.status === 'rented'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-card'
                        }`}>
                          <p className="font-bold text-base leading-tight truncate">{room.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {room.price.toLocaleString('vi-VN')}đ
                          </p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              room.status === 'rented' ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            <span className={`text-xs truncate ${
                              room.status === 'rented' ? 'text-green-700' : 'text-muted-foreground'
                            }`}>
                              {room.status === 'rented' ? 'Đang thuê' : 'Trống'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
