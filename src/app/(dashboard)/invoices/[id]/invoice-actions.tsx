'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Invoice, Room, Tenant, Settings } from '@/types/database'
import { CheckCircle, Printer, Trash2 } from 'lucide-react'

interface Props {
  invoice: Invoice
  settings: Settings | null
  room: Room | null
  tenant: Tenant | null
}

export function InvoiceActions({ invoice }: Pick<Props, 'invoice'>) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function handleMarkPaid() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('invoices')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq('id', invoice.id)

    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success('Đã đánh dấu thanh toán')
    router.refresh()
    setLoading(false)
  }

  async function handleMarkUnpaid() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('invoices')
      .update({ is_paid: false, paid_at: null })
      .eq('id', invoice.id)

    if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
    toast.success('Đã đánh dấu chưa thu')
    router.refresh()
    setLoading(false)
  }

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id)
    if (error) { toast.error('Xóa thất bại: ' + error.message); setLoading(false); return }
    toast.success('Đã xóa hóa đơn')
    router.refresh()
    router.push('/invoices')
  }

  return (
    <div className="space-y-3 pt-2">
      {!invoice.is_paid ? (
        <Button
          className="w-full gap-2 bg-green-500 hover:bg-green-600"
          onClick={handleMarkPaid}
          disabled={loading}
        >
          <CheckCircle className="h-4 w-4" />
          {loading ? 'Đang xử lý...' : 'Đánh dấu đã thu tiền'}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleMarkUnpaid}
          disabled={loading}
        >
          {loading ? 'Đang xử lý...' : 'Đánh dấu chưa thu'}
        </Button>
      )}

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        In hóa đơn
      </Button>

      <Button
        variant="ghost"
        className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        Xóa hóa đơn
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa hóa đơn</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Hành động này không thể hoàn tác.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
