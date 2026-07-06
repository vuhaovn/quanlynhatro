import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import Link from 'next/link'
import { Invoice, Room } from '@/types/database'
import { PrintButton } from './_components/print-button'
import { InvoiceList } from './_components/invoice-list'
import { ExcelExportButton } from './_components/excel-export-button'

type InvoiceWithRoom = Invoice & { room: Pick<Room, 'name' | 'floor'> | null }

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices')
    .select('*, room:rooms(name, floor)')
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  const invoices = (data ?? []) as InvoiceWithRoom[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Hóa đơn</h1>
        <div className="flex items-center gap-2">
          <ExcelExportButton invoices={invoices} />
          <PrintButton />
          <Link href="/invoices/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tạo
            </Button>
          </Link>
        </div>
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
        <InvoiceList invoices={invoices} />
      )}
    </div>
  )
}
