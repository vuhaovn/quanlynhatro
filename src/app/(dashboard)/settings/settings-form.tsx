'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Settings } from '@/types/database'
import { z } from 'zod'
import { ImagePlus, Trash2, Loader2 } from 'lucide-react'
import Image from 'next/image'

const settingsSchema = z.object({
  electric_price: z.number().positive('Giá điện phải lớn hơn 0'),
  water_price: z.number().positive('Giá nước phải lớn hơn 0'),
  garbage_fee: z.number().min(0),
  internet_fee: z.number().min(0),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_owner: z.string().optional(),
})

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const [loading, setLoading] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(settings?.qr_image_url ?? null)
  const [qrLoading, setQrLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    electric_price: settings?.electric_price ?? 3500,
    water_price: settings?.water_price ?? 15000,
    garbage_fee: settings?.garbage_fee ?? 0,
    internet_fee: settings?.internet_fee ?? 0,
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
      garbage_fee: result.data.garbage_fee,
      internet_fee: result.data.internet_fee,
      bank_name: form.bank_name || null,
      bank_account: form.bank_account || null,
      bank_owner: form.bank_owner || null,
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('settings')
      .upsert({ ...payload, user_id: user!.id }, { onConflict: 'user_id' })

    if (error) {
      toast.error('Lưu thất bại: ' + error.message)
    } else {
      toast.success('Đã lưu cài đặt')
    }
    setLoading(false)
  }

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setQrLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${user!.id}/qr.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('qr-images')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      toast.error('Upload thất bại: ' + uploadError.message)
      setQrLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('qr-images').getPublicUrl(path)
    // Bust cache so the new image shows immediately
    const urlWithBust = `${publicUrl}?t=${Date.now()}`

    const { error: saveError } = await supabase
      .from('settings')
      .upsert({ user_id: user!.id, qr_image_url: publicUrl }, { onConflict: 'user_id' })

    if (saveError) {
      toast.error('Lưu thất bại: ' + saveError.message)
    } else {
      setQrUrl(urlWithBust)
      toast.success('Đã upload QR code')
    }
    setQrLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleQrRemove() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('settings').upsert({ user_id: user!.id, qr_image_url: null }, { onConflict: 'user_id' })
    setQrUrl(null)
    toast.success('Đã xóa QR code')
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="electric_price" className="text-[12px]">Giá điện (đ/kWh)</Label>
          <Input
            id="electric_price"
            type="number"
            value={form.electric_price}
            onChange={(e) => setForm({ ...form, electric_price: Number(e.target.value) })}
            min={0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="water_price" className="text-[12px]">Giá nước (đ/m³)</Label>
          <Input
            id="water_price"
            type="number"
            value={form.water_price}
            onChange={(e) => setForm({ ...form, water_price: Number(e.target.value) })}
            min={0}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="garbage_fee" className="text-[12px]">Tiền rác (đ/tháng)</Label>
          <Input
            id="garbage_fee"
            type="number"
            value={form.garbage_fee}
            onChange={(e) => setForm({ ...form, garbage_fee: Number(e.target.value) })}
            min={0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="internet_fee" className="text-[12px]">Cáp mạng (đ/tháng)</Label>
          <Input
            id="internet_fee"
            type="number"
            value={form.internet_fee}
            onChange={(e) => setForm({ ...form, internet_fee: Number(e.target.value) })}
            min={0}
          />
        </div>
      </div>

      {/* Bank info */}
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

      {/* QR Code */}
      <div className="space-y-3 pt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mã QR thanh toán</p>
        <div className="flex items-start gap-4">
          {qrUrl ? (
            <div className="relative">
              <Image
                src={qrUrl}
                alt="QR Code"
                width={120}
                height={120}
                className="rounded-lg border object-contain bg-white"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-[120px] h-[120px] rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 shrink-0">
              <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}

          <div className="flex flex-col gap-2 justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQrUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={qrLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              {qrLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <ImagePlus className="h-3.5 w-3.5" />}
              {qrUrl ? 'Thay ảnh' : 'Upload QR'}
            </Button>
            {qrUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleQrRemove}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground leading-tight">
              QR sẽ được in trên<br />hóa đơn
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
      </Button>
    </form>
  )
}
