'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Tenant, Room } from '@/types/database'
import { z } from 'zod'

const schema = z.object({
  full_name: z.string().min(1, 'Họ tên không được để trống'),
  phone: z.string().min(9, 'Số điện thoại không hợp lệ'),
  cccd: z.string().min(9, 'Số CCCD không hợp lệ'),
  room_id: z.string().nullable(),
  start_date: z.string().min(1, 'Ngày bắt đầu không được để trống'),
  end_date: z.string().nullable(),
})

interface Props {
  tenant?: Tenant
  rooms: Room[]
}

export function TenantForm({ tenant, rooms }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: tenant?.full_name ?? '',
    phone: tenant?.phone ?? '',
    cccd: tenant?.cccd ?? '',
    room_id: tenant?.room_id ?? '',
    start_date: tenant?.start_date ?? new Date().toISOString().split('T')[0],
    end_date: tenant?.end_date ?? '',
  })

  const isEdit = !!tenant

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = schema.safeParse({
      ...form,
      room_id: form.room_id || null,
      end_date: form.end_date || null,
    })
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const payload = {
      full_name: result.data.full_name,
      phone: result.data.phone,
      cccd: result.data.cccd,
      room_id: result.data.room_id,
      start_date: result.data.start_date,
      end_date: result.data.end_date,
    }

    if (isEdit) {
      const oldRoomId = tenant.room_id
      const newRoomId = payload.room_id

      const { error } = await supabase.from('tenants').update(payload).eq('id', tenant.id)
      if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }

      // Update room statuses if room assignment changed
      if (oldRoomId && oldRoomId !== newRoomId) {
        await supabase.from('rooms').update({ status: 'empty' }).eq('id', oldRoomId)
      }
      if (newRoomId && newRoomId !== oldRoomId) {
        await supabase.from('rooms').update({ status: 'rented' }).eq('id', newRoomId)
      }

      toast.success('Đã cập nhật thông tin')
    } else {
      const { error } = await supabase.from('tenants').insert({ ...payload, is_active: true })
      if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }

      if (payload.room_id) {
        await supabase.from('rooms').update({ status: 'rented' }).eq('id', payload.room_id)
      }

      toast.success('Đã thêm người thuê')
    }

    router.push('/tenants')
    router.refresh()
  }

  const availableRooms = rooms.filter(
    (r) => r.status === 'empty' || r.id === tenant?.room_id
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Họ tên *</Label>
        <Input
          id="full_name"
          placeholder="VD: Nguyễn Văn A"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Số điện thoại *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="0912345678"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cccd">CCCD *</Label>
          <Input
            id="cccd"
            placeholder="001234567890"
            value={form.cccd}
            onChange={(e) => setForm({ ...form, cccd: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Phòng</Label>
        <Select
          value={form.room_id}
          onValueChange={(v) => setForm({ ...form, room_id: (!v || v === 'none') ? '' : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn phòng..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Chưa gán phòng</SelectItem>
            {availableRooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} — {r.price.toLocaleString('vi-VN')}đ/tháng
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Ngày vào *</Label>
          <Input
            id="start_date"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">Ngày kết thúc</Label>
          <Input
            id="end_date"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Hủy
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm người thuê'}
        </Button>
      </div>
    </form>
  )
}
