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

  async function handleEndContract() {
    if (!endDate) { toast.error('Vui lòng chọn ngày kết thúc'); return }
    setLoading(true)
    const supabase = createClient()

    // 1. Ghi lịch sử thuê
    const { error: historyError } = await supabase.from('rental_history').insert({
      room_id: tenant.room_id!,
      tenant_name: tenant.full_name,
      tenant_phone: tenant.phone,
      tenant_cccd: tenant.cccd,
      start_date: tenant.start_date,
      end_date: endDate,
    })
    if (historyError) { toast.error('Lỗi ghi lịch sử: ' + historyError.message); setLoading(false); return }

    // 2. Cập nhật người thuê: inactive, xóa room_id, set end_date
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({ is_active: false, end_date: endDate, room_id: null })
      .eq('id', tenant.id)
    if (tenantError) { toast.error('Lỗi cập nhật: ' + tenantError.message); setLoading(false); return }

    // 3. Phòng chuyển về trống
    await supabase.from('rooms').update({ status: 'empty' }).eq('id', tenant.room_id!)

    toast.success('Đã kết thúc hợp đồng')
    router.push('/tenants')
    router.refresh()
  }

  return (
    <div className="pt-2">
      <Button
        variant="ghost"
        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 w-full gap-2"
        onClick={() => setOpen(true)}
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
