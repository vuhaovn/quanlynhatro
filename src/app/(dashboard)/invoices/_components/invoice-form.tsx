'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Room, Tenant, Settings } from '@/types/database'
import { z } from 'zod'

const schema = z.object({
  room_id: z.string().min(1, 'Vui lòng chọn phòng'),
  tenant_id: z.string().min(1, 'Không tìm thấy người thuê'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  room_price: z.number().positive(),
  electric_start: z.preprocess(Number, z.number().min(0)),
  electric_end: z.preprocess(Number, z.number().min(0)),
  electric_price: z.preprocess(Number, z.number().positive()),
  water_start: z.preprocess(Number, z.number().min(0)),
  water_end: z.preprocess(Number, z.number().min(0)),
  water_price: z.preprocess(Number, z.number().positive()),
  note: z.string().nullable(),
})

interface RoomWithTenant extends Room {
  tenant: Tenant | null
}

interface Props {
  rooms: RoomWithTenant[]
  settings: Settings | null
}

export function InvoiceForm({ rooms, settings }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const now = new Date()
  const [form, setForm] = useState<{
    room_id: string
    tenant_id: string
    month: number
    year: number
    room_price: number
    electric_start: string
    electric_end: string
    electric_price: string
    water_start: string
    water_end: string
    water_price: string
    note: string
  }>({
    room_id: '',
    tenant_id: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    room_price: 0,
    electric_start: '',
    electric_end: '',
    electric_price: settings?.electric_price?.toString() ?? '3500',
    water_start: '',
    water_end: '',
    water_price: settings?.water_price?.toString() ?? '15000',
    note: '',
  })

  // When room changes, auto-fill room_price and tenant
  useEffect(() => {
    if (!form.room_id) return
    const room = rooms.find((r) => r.id === form.room_id)
    if (!room) return
    setForm((prev) => ({
      ...prev,
      room_price: room.price,
      tenant_id: room.tenant?.id ?? '',
    }))
  }, [form.room_id, rooms])

  const electricUsage = Math.max(0, Number(form.electric_end) - Number(form.electric_start))
  const waterUsage = Math.max(0, Number(form.water_end) - Number(form.water_start))
  const electricTotal = Math.round(electricUsage * Number(form.electric_price))
  const waterTotal = Math.round(waterUsage * Number(form.water_price))
  const grandTotal = form.room_price + electricTotal + waterTotal

  const selectedRoom = rooms.find((r) => r.id === form.room_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (Number(form.electric_end) < Number(form.electric_start)) {
      toast.error('Chỉ số điện cuối kỳ phải lớn hơn đầu kỳ')
      return
    }
    if (Number(form.water_end) < Number(form.water_start)) {
      toast.error('Chỉ số nước cuối kỳ phải lớn hơn đầu kỳ')
      return
    }

    const result = schema.safeParse({
      ...form,
      month: form.month,
      year: form.year,
    })
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('invoices').insert({
      room_id: result.data.room_id,
      tenant_id: result.data.tenant_id,
      month: result.data.month,
      year: result.data.year,
      room_price: result.data.room_price,
      electric_start: result.data.electric_start,
      electric_end: result.data.electric_end,
      electric_price: result.data.electric_price,
      water_start: result.data.water_start,
      water_end: result.data.water_end,
      water_price: result.data.water_price,
      note: form.note || null,
      is_paid: false,
    })

    if (error) {
      if (error.code === '23505') {
        toast.error(`Hóa đơn tháng ${form.month}/${form.year} của phòng này đã tồn tại`)
      } else {
        toast.error('Lỗi: ' + error.message)
      }
      setLoading(false)
      return
    }

    toast.success('Đã tạo hóa đơn')
    router.refresh()
    router.push('/invoices')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Room + Period */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Phòng *</Label>
          <Select value={form.room_id} onValueChange={(v) => setForm({ ...form, room_id: v ?? '' })}>
            <SelectTrigger className="w-full">
              <span className={`flex flex-1 text-left text-sm ${!form.room_id ? 'text-muted-foreground' : ''}`}>
                {form.room_id
                  ? (() => { const r = rooms.find(r => r.id === form.room_id); return r ? `${r.name}${r.tenant ? ` — ${r.tenant.full_name}` : ''}` : 'Chọn phòng...' })()
                  : 'Chọn phòng đang thuê...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                  {r.tenant ? ` — ${r.tenant.full_name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRoom?.tenant && (
            <p className="text-xs text-muted-foreground">
              Người thuê: <strong>{selectedRoom.tenant.full_name}</strong> · {selectedRoom.tenant.phone}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="month">Tháng *</Label>
            <Select
              value={form.month.toString()}
              onValueChange={(v) => setForm({ ...form, month: parseInt(v ?? '1') })}
            >
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left text-sm">Tháng {form.month}</span>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="year">Năm *</Label>
            <Select
              value={form.year.toString()}
              onValueChange={(v) => setForm({ ...form, year: parseInt(v ?? String(now.getFullYear())) })}
            >
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left text-sm">{form.year}</span>
              </SelectTrigger>
              <SelectContent>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Electric */}
      <div className="space-y-2">
        <p className="text-sm font-medium">⚡ Điện</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e_start">Chỉ số đầu kỳ</Label>
            <Input
              id="e_start"
              type="number"
              placeholder="0"
              value={form.electric_start}
              onChange={(e) => setForm({ ...form, electric_start: e.target.value })}
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e_end">Chỉ số cuối kỳ</Label>
            <Input
              id="e_end"
              type="number"
              placeholder="0"
              value={form.electric_end}
              onChange={(e) => setForm({ ...form, electric_end: e.target.value })}
              min={0}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e_price">Đơn giá (đ/kWh)</Label>
          <Input
            id="e_price"
            type="number"
            value={form.electric_price}
            onChange={(e) => setForm({ ...form, electric_price: e.target.value })}
            min={0}
          />
        </div>
        {electricUsage > 0 && (
          <p className="text-xs text-muted-foreground">
            {electricUsage} kWh × {Number(form.electric_price).toLocaleString('vi-VN')}đ ={' '}
            <strong>{electricTotal.toLocaleString('vi-VN')}đ</strong>
          </p>
        )}
      </div>

      <Separator />

      {/* Water */}
      <div className="space-y-2">
        <p className="text-sm font-medium">💧 Nước</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="w_start">Chỉ số đầu kỳ</Label>
            <Input
              id="w_start"
              type="number"
              placeholder="0"
              value={form.water_start}
              onChange={(e) => setForm({ ...form, water_start: e.target.value })}
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w_end">Chỉ số cuối kỳ</Label>
            <Input
              id="w_end"
              type="number"
              placeholder="0"
              value={form.water_end}
              onChange={(e) => setForm({ ...form, water_end: e.target.value })}
              min={0}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w_price">Đơn giá (đ/m³)</Label>
          <Input
            id="w_price"
            type="number"
            value={form.water_price}
            onChange={(e) => setForm({ ...form, water_price: e.target.value })}
            min={0}
          />
        </div>
        {waterUsage > 0 && (
          <p className="text-xs text-muted-foreground">
            {waterUsage} m³ × {Number(form.water_price).toLocaleString('vi-VN')}đ ={' '}
            <strong>{waterTotal.toLocaleString('vi-VN')}đ</strong>
          </p>
        )}
      </div>

      <Separator />

      {/* Total preview */}
      <Card className="bg-gray-50">
        <CardContent className="px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tiền phòng</span>
            <span>{form.room_price.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tiền điện</span>
            <span>{electricTotal.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tiền nước</span>
            <span>{waterTotal.toLocaleString('vi-VN')}đ</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Tổng cộng</span>
            <span className="text-lg">{grandTotal.toLocaleString('vi-VN')}đ</span>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <div className="space-y-1.5">
        <Label htmlFor="note">Ghi chú</Label>
        <Textarea
          id="note"
          placeholder="Ghi chú thêm..."
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          rows={2}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Hủy
        </Button>
        <Button type="submit" className="flex-1" disabled={loading || !form.room_id}>
          {loading ? 'Đang tạo...' : 'Tạo hóa đơn'}
        </Button>
      </div>
    </form>
  )
}
