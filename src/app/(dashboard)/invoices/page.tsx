import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, FileText } from 'lucide-react'
import Link from 'next/link'
import { Invoice, Room } from '@/types/database'

type InvoiceWithRoom = Invoice & { room: Pick<Room, 'name'> | null }

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices')
    .select('*, room:rooms(name)')
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  const invoices = (data ?? []) as InvoiceWithRoom[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Hóa đơn</h1>
        <Link href="/invoices/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Tạo hóa đơn
          </Button>
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có hóa đơn nào</p>
          <Link href="/invoices/new">
            <Button variant="outline" size="sm" className="mt-3">
              Tạo hóa đơn đầu tiên
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {invoice.room?.name ?? 'Phòng không xác định'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tháng {invoice.month}/{invoice.year}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-semibold">
                      {invoice.total_amount.toLocaleString('vi-VN')}đ
                    </p>
                    <Badge
                      variant={invoice.is_paid ? 'default' : 'outline'}
                      className={invoice.is_paid ? 'bg-green-500 hover:bg-green-600 text-xs' : 'text-orange-600 border-orange-300 text-xs'}
                    >
                      {invoice.is_paid ? 'Đã thu' : 'Chưa thu'}
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
