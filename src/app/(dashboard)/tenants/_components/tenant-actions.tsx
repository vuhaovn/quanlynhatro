'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Tenant } from '@/types/database'
import { LogOut } from 'lucide-react'

interface Props {
  tenant: Tenant
}

export function TenantActions({ tenant }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [unpaidTotal, setUnpaidTotal] = useState<number | null>(null)

  async function handleOpen() {
    setOpen(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('tenant_id', tenant.id)
      .eq('is_paid', false)
    const total = (data ?? []).reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)
    setUnpaidTotal(total)
  }

  async function handleEndContract() {
    if (!endDate) { toast.error('Vui lòng chọn ngày kết thúc'); return }
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { error: historyError } = await supabase.from('rental_history').insert({
      user_id: user!.id,
      room_id: tenant.room_id!,
      tenant_name: tenant.full_name,
      tenant_phone: tenant.phone,
      tenant_cccd: tenant.cccd,
      start_date: tenant.start_date,
      end_date: endDate,
    })
    if (historyError) { toast.error('Lỗi ghi lịch sử: ' + historyError.message); setLoading(false); return }

    const { error: tenantError } = await supabase
      .from('tenants')
      .update({ is_active: false, end_date: endDate, room_id: null })
      .eq('id', tenant.id)
    if (tenantError) { toast.error('Lỗi cập nhật: ' + tenantError.message); setLoading(false); return }

    const { count } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', tenant.room_id!)
      .eq('is_active', true)
      .neq('id', tenant.id)
    if (count === 0) {
      await supabase.from('rooms').update({ status: 'empty' }).eq('id', tenant.room_id!)
    }

    toast.success('Đã kết thúc hợp đồng')
    router.refresh()
    router.push('/tenants')
  }

  const refund = tenant.deposit - (unpaidTotal ?? 0)

  return (
    <div className="pt-2">
      <Button
        variant="ghost"
        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 w-full gap-2"
        onClick={handleOpen}
      >
        <LogOut className="h-4 w-4" />
        Kết thúc hợp đồng
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kết thúc hợp đồng</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Người thuê <strong>{tenant.full_name}</strong> sẽ rời phòng. Phòng sẽ chuyển về trạng thái trống.
          </p>

          {tenant.deposit > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiền cọc</span>
                <span className="font-medium">{tenant.deposit.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hóa đơn chưa thu</span>
                <span className={unpaidTotal ? 'font-medium text-red-600' : 'font-medium'}>
                  {unpaidTotal === null ? '...' : `${unpaidTotal.toLocaleString('vi-VN')}đ`}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>{refund >= 0 ? 'Hoàn lại cho khách' : 'Khách còn nợ'}</span>
                <span className={refund >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {unpaidTotal === null ? '...' : `${Math.abs(refund).toLocaleString('vi-VN')}đ`}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="end_date">Ngày rời đi</Label>
            <Input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleEndContract}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận kết thúc'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
