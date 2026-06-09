import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Room, Tenant } from '@/types/database'
import { RoomForm } from '../_components/room-form'
import { RoomActions } from '../_components/room-actions'

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [roomRes, tenantRes] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', id).single(),
    supabase.from('tenants').select('*').eq('room_id', id).eq('is_active', true).maybeSingle(),
  ])

  if (!roomRes.data) notFound()

  const room = roomRes.data as Room
  const tenant = tenantRes.data as Tenant | null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/rooms" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{room.name}</h1>
          <Badge
            variant={room.status === 'rented' ? 'default' : 'outline'}
            className={room.status === 'rented' ? 'bg-green-500 hover:bg-green-600 text-xs mt-0.5' : 'text-xs mt-0.5'}
          >
            {room.status === 'rented' ? 'Đang thuê' : 'Trống'}
          </Badge>
        </div>
      </div>

      {/* Current tenant */}
      {tenant && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="px-4 pt-4 pb-1">
            <CardTitle className="text-sm text-green-700">Người đang thuê</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Link href={`/tenants/${tenant.id}`} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{tenant.full_name}</p>
                <p className="text-xs text-muted-foreground">{tenant.phone} · CCCD: {tenant.cccd}</p>
                <p className="text-xs text-muted-foreground">
                  Từ {new Date(tenant.start_date).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Edit form */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm text-muted-foreground">Chỉnh sửa thông tin</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <RoomForm room={room} />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <RoomActions roomId={room.id} hasActiveTenant={!!tenant} />
    </div>
  )
}
