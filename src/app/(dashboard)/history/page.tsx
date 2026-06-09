import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { History } from 'lucide-react'
import { RentalHistory, Room } from '@/types/database'

type HistoryWithRoom = RentalHistory & { room: Pick<Room, 'name'> | null }

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('rental_history')
    .select('*, room:rooms(name)')
    .order('end_date', { ascending: false })

  const history = (data ?? []) as HistoryWithRoom[]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5" />
        <h1 className="text-xl font-bold">Lịch sử thuê</h1>
      </div>

      {!history || history.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có lịch sử nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((record) => (
            <Card key={record.id}>
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{record.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">{record.tenant_phone}</p>
                    <p className="text-xs text-muted-foreground">CCCD: {record.tenant_cccd}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {record.room?.name ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.start_date).toLocaleDateString('vi-VN')} —{' '}
                      {new Date(record.end_date).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
