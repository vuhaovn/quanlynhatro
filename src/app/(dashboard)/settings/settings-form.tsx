'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Settings } from '@/types/database'
import { z } from 'zod'

const settingsSchema = z.object({
  electric_price: z.number().positive('Giá điện phải lớn hơn 0'),
  water_price: z.number().positive('Giá nước phải lớn hơn 0'),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_owner: z.string().optional(),
})

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    electric_price: settings?.electric_price ?? 3500,
    water_price: settings?.water_price ?? 15000,
    bank_name: settings?.bank_name ?? '',
    bank_account: settings?.bank_account ?? '',
    bank_owner: settings?.bank_owner ?? '',
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const result = settingsSchema.safeParse({
      ...form,
      electric_price: Number(form.electric_price),
      water_price: Number(form.water_price),
    })

    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const payload = {
      electric_price: result.data.electric_price,
      water_price: result.data.water_price,
      bank_name: form.bank_name || null,
      bank_account: form.bank_account || null,
      bank_owner: form.bank_owner || null,
    }

    let error
    if (settings?.id) {
      ;({ error } = await supabase.from('settings').update(payload).eq('id', settings.id))
    } else {
      ;({ error } = await supabase.from('settings').insert(payload))
    }

    if (error) {
      toast.error('Lưu thất bại: ' + error.message)
    } else {
      toast.success('Đã lưu cài đặt')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="electric_price">Giá điện (đ/kWh)</Label>
          <Input
            id="electric_price"
            type="number"
            value={form.electric_price}
            onChange={(e) => setForm({ ...form, electric_price: Number(e.target.value) })}
            min={0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="water_price">Giá nước (đ/m³)</Label>
          <Input
            id="water_price"
            type="number"
            value={form.water_price}
            onChange={(e) => setForm({ ...form, water_price: Number(e.target.value) })}
            min={0}
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thông tin ngân hàng</p>
        <div className="space-y-1.5">
          <Label htmlFor="bank_name">Tên ngân hàng</Label>
          <Input
            id="bank_name"
            placeholder="VD: Vietcombank"
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bank_account">Số tài khoản</Label>
          <Input
            id="bank_account"
            placeholder="VD: 1234567890"
            value={form.bank_account}
            onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bank_owner">Chủ tài khoản</Label>
          <Input
            id="bank_owner"
            placeholder="VD: NGUYEN VAN A"
            value={form.bank_owner}
            onChange={(e) => setForm({ ...form, bank_owner: e.target.value })}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
      </Button>
    </form>
  )
}
