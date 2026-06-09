import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RoomForm } from '../_components/room-form'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewRoomPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/rooms" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Thêm phòng mới</h1>
      </div>

      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm text-muted-foreground">Thông tin phòng</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <RoomForm />
        </CardContent>
      </Card>
    </div>
  )
}
