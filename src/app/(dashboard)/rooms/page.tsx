import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, DoorOpen } from 'lucide-react'
import Link from 'next/link'
import { Room } from '@/types/database'

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('rooms').select('*').order('floor').order('name')
  const rooms = ((data ?? []) as Room[]).sort((a, b) => {
    const floorDiff = (a.floor ?? 0) - (b.floor ?? 0)
    if (floorDiff !== 0) return floorDiff
    return a.name.localeCompare(b.name, 'vi', { numeric: true })
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Quản lý Phòng</h1>
        <Link href="/rooms/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Thêm phòng
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
        <div className="space-y-3">
          {rooms.map((room) => (
            <Link key={room.id} href={`/rooms/${room.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="px-4 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-base">{room.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {room.floor ? `Tầng ${room.floor}` : 'Chưa có tầng'}
                      {room.description ? ` · ${room.description}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1.5">
                    <p className="text-sm font-medium">{room.price.toLocaleString('vi-VN')}đ/tháng</p>
                    <Badge
                      variant={room.status === 'rented' ? 'default' : 'outline'}
                      className={room.status === 'rented' ? 'bg-green-500 hover:bg-green-600' : ''}
                    >
                      {room.status === 'rented' ? 'Đang thuê' : 'Trống'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
