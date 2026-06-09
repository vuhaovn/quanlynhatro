'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Room } from '@/types/database'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Tên phòng không được để trống'),
  floor: z.preprocess((v) => (v === '' || v === null ? null : Number(v)), z.number().int().nullable()),
  price: z.preprocess((v) => Number(v), z.number().positive('Giá thuê phải lớn hơn 0')),
  description: z.string().nullable(),
})

interface Props {
  room?: Room
}

export function RoomForm({ room }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: room?.name ?? '',
    floor: room?.floor?.toString() ?? '',
    price: room?.price?.toString() ?? '',
    description: room?.description ?? '',
  })

  const isEdit = !!room

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = schema.safeParse(form)
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const payload = {
      name: result.data.name,
      floor: result.data.floor,
      price: result.data.price,
      description: result.data.description || null,
    }

    if (isEdit) {
      const { error } = await supabase.from('rooms').update(payload).eq('id', room.id)
      if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
      toast.success('Đã cập nhật phòng')
    } else {
      const { error } = await supabase.from('rooms').insert({ ...payload, status: 'empty' })
      if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
      toast.success('Đã thêm phòng')
    }

    router.push('/rooms')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Tên phòng *</Label>
        <Input
          id="name"
          placeholder="VD: Phòng 101"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="floor">Tầng</Label>
          <Input
            id="floor"
            type="number"
            placeholder="VD: 1"
            value={form.floor}
            onChange={(e) => setForm({ ...form, floor: e.target.value })}
            min={1}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Giá thuê/tháng *</Label>
          <Input
            id="price"
            type="number"
            placeholder="VD: 2000000"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            min={0}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          placeholder="Ghi chú thêm về phòng..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Hủy
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm phòng'}
        </Button>
      </div>
    </form>
  )
}
