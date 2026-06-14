'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { Tenant, Room } from '@/types/database'
import { z } from 'zod'
import { RotateCcw, X } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(1, 'Họ tên không được để trống'),
  phone: z.string().min(9, 'Số điện thoại không hợp lệ'),
  cccd: z.string().min(9, 'Số CCCD không hợp lệ'),
  room_id: z.string().nullable(),
  start_date: z.string().min(1, 'Ngày bắt đầu không được để trống'),
  end_date: z.string().nullable(),
  deposit: z.preprocess((v) => Number(String(v).replace(/,/g, '')), z.number().min(0, 'Tiền cọc không hợp lệ')),
  gender: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  hometown: z.string().nullable(),
  workplace: z.string().nullable(),
  temp_residence: z.boolean().nullable(),
  ethnicity: z.string().nullable(),
  religion: z.string().nullable(),
  occupation: z.string().nullable(),
})

function formatVND(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

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
    deposit: tenant?.deposit ? formatVND(tenant.deposit.toString()) : '',
    gender: tenant?.gender ?? '',
    date_of_birth: tenant?.date_of_birth ?? '',
    hometown: tenant?.hometown ?? '',
    workplace: tenant?.workplace ?? '',
    temp_residence: tenant?.temp_residence ?? null as boolean | null,
    ethnicity: tenant?.ethnicity ?? '',
    religion: tenant?.religion ?? '',
    occupation: tenant?.occupation ?? '',
  })
  const [returningTenant, setReturningTenant] = useState<Tenant | null>(null)
  const [reactivateId, setReactivateId] = useState<string | null>(null)

  const isEdit = !!tenant

  async function checkReturning(field: 'phone' | 'cccd', value: string) {
    if (isEdit || reactivateId || !value || value.length < 9) return
    const supabase = createClient()
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq(field, value)
      .eq('is_active', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) setReturningTenant(data as Tenant)
  }

  function applyReturning(t: Tenant) {
    setForm({
      full_name: t.full_name,
      phone: t.phone,
      cccd: t.cccd,
      room_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      deposit: t.deposit ? formatVND(t.deposit.toString()) : '',
      gender: t.gender ?? '',
      date_of_birth: t.date_of_birth ?? '',
      hometown: t.hometown ?? '',
      workplace: t.workplace ?? '',
      temp_residence: t.temp_residence ?? null,
      ethnicity: t.ethnicity ?? '',
      religion: t.religion ?? '',
      occupation: t.occupation ?? '',
    })
    setReactivateId(t.id)
    setReturningTenant(null)
  }

  function cancelReactivate() {
    setReactivateId(null)
    setForm({
      full_name: '',
      phone: '',
      cccd: '',
      room_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      deposit: '',
      gender: '',
      date_of_birth: '',
      hometown: '',
      workplace: '',
      temp_residence: null,
      ethnicity: '',
      religion: '',
      occupation: '',
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = schema.safeParse({
      ...form,
      room_id: form.room_id || null,
      end_date: form.end_date || null,
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
      hometown: form.hometown || null,
      workplace: form.workplace || null,
      ethnicity: form.ethnicity || null,
      religion: form.religion || null,
      occupation: form.occupation || null,
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
      deposit: result.data.deposit,
      gender: result.data.gender,
      date_of_birth: result.data.date_of_birth,
      hometown: result.data.hometown,
      workplace: result.data.workplace,
      temp_residence: result.data.temp_residence,
      ethnicity: result.data.ethnicity,
      religion: result.data.religion,
      occupation: result.data.occupation,
    }

    if (reactivateId) {
      const { error } = await supabase
        .from('tenants')
        .update({ ...payload, is_active: true, end_date: null })
        .eq('id', reactivateId)
      if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
      if (payload.room_id) {
        await supabase.from('rooms').update({ status: 'rented' }).eq('id', payload.room_id)
      }
      toast.success('Đã tái kích hoạt người thuê')
    } else if (isEdit) {
      const oldRoomId = tenant.room_id
      const newRoomId = payload.room_id
      const updateData = tenant.is_active
        ? payload
        : { ...payload, is_active: true, end_date: null }
      const { error } = await supabase.from('tenants').update(updateData).eq('id', tenant.id)
      if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
      if (oldRoomId && oldRoomId !== newRoomId) {
        const { count } = await supabase
          .from('tenants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', oldRoomId)
          .eq('is_active', true)
          .neq('id', tenant.id)
        if (count === 0) {
          await supabase.from('rooms').update({ status: 'empty' }).eq('id', oldRoomId)
        }
      }
      if (newRoomId && newRoomId !== oldRoomId) {
        await supabase.from('rooms').update({ status: 'rented' }).eq('id', newRoomId)
      }
      toast.success(tenant.is_active ? 'Đã cập nhật thông tin' : 'Đã tái kích hoạt người thuê')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('tenants').insert({ ...payload, is_active: true, user_id: user!.id })
      if (error) { toast.error('Lỗi: ' + error.message); setLoading(false); return }
      if (payload.room_id) {
        await supabase.from('rooms').update({ status: 'rented' }).eq('id', payload.room_id)
      }
      toast.success('Đã thêm người thuê')
    }

    router.refresh()
    router.push('/tenants')
  }

  const availableRooms = rooms

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {returningTenant && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                Người này đã từng thuê trước đây
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {returningTenant.full_name} · Rời ngày {returningTenant.end_date ?? '—'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" type="button" className="h-7 text-xs" onClick={() => setReturningTenant(null)}>
                Bỏ qua
              </Button>
              <Button size="sm" type="button" className="h-7 text-xs" onClick={() => applyReturning(returningTenant)}>
                Tái kích hoạt
              </Button>
            </div>
          </div>
        </div>
      )}

      {reactivateId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-sm text-blue-700 flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            Đang tái kích hoạt người thuê cũ
          </p>
          <button type="button" onClick={cancelReactivate} className="text-blue-400 hover:text-blue-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isEdit && !tenant.is_active && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <p className="text-sm text-blue-700 flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            Chọn phòng và ngày vào, rồi nhấn <strong>Tái kích hoạt</strong>
          </p>
        </div>
      )}

      {/* Thông tin cơ bản */}
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
            onBlur={(e) => checkReturning('phone', e.target.value)}
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
            onBlur={(e) => checkReturning('cccd', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Giới tính</Label>
          <Select
            value={form.gender ?? ''}
            onValueChange={(v) => setForm({ ...form, gender: (!v || v === 'none') ? '' : v })}
          >
            <SelectTrigger className="w-full">
              <span className={`flex flex-1 text-left text-sm ${!form.gender ? 'text-muted-foreground' : ''}`}>
                {form.gender || 'Chọn...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="Nam">Nam</SelectItem>
              <SelectItem value="Nữ">Nữ</SelectItem>
              <SelectItem value="Khác">Khác</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date_of_birth">Ngày sinh</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hometown">Hộ khẩu thường trú</Label>
        <Textarea
          id="hometown"
          placeholder="Địa chỉ thường trú..."
          value={form.hometown}
          onChange={(e) => setForm({ ...form, hometown: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="workplace">Nơi làm việc</Label>
        <Input
          id="workplace"
          placeholder="Tên công ty, địa chỉ..."
          value={form.workplace}
          onChange={(e) => setForm({ ...form, workplace: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="occupation">Công việc</Label>
        <Input
          id="occupation"
          placeholder="VD: Công nhân, Sinh viên..."
          value={form.occupation}
          onChange={(e) => setForm({ ...form, occupation: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ethnicity">Dân tộc</Label>
          <Input
            id="ethnicity"
            placeholder="VD: Kinh, Tày..."
            value={form.ethnicity}
            onChange={(e) => setForm({ ...form, ethnicity: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="religion">Tôn giáo</Label>
          <Input
            id="religion"
            placeholder="VD: Không, Phật giáo..."
            value={form.religion}
            onChange={(e) => setForm({ ...form, religion: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Đăng ký tạm trú</Label>
        <Select
          value={form.temp_residence === null ? '' : form.temp_residence ? 'true' : 'false'}
          onValueChange={(v) => setForm({ ...form, temp_residence: (!v || v === '') ? null : v === 'true' })}
        >
          <SelectTrigger className="w-full">
            <span className={`flex flex-1 text-left text-sm ${form.temp_residence === null ? 'text-muted-foreground' : ''}`}>
              {form.temp_residence === null ? 'Chọn...' : form.temp_residence ? 'Có' : 'Không'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">—</SelectItem>
            <SelectItem value="true">Có</SelectItem>
            <SelectItem value="false">Không</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Thông tin hợp đồng */}
      <div className="space-y-1.5">
        <Label>Phòng</Label>
        <Select
          value={form.room_id}
          onValueChange={(v) => setForm({ ...form, room_id: (!v || v === 'none') ? '' : v })}
        >
          <SelectTrigger className="w-full">
            <span className={`flex flex-1 text-left text-sm ${!form.room_id ? 'text-muted-foreground' : ''}`}>
              {form.room_id
                ? (() => {
                    const r = availableRooms.find((r) => r.id === form.room_id)
                    return r ? `${r.floor ? `Khu ${r.floor} - ` : ''}${r.name}` : 'Chọn phòng...'
                  })()
                : 'Chọn phòng...'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Chưa gán phòng</SelectItem>
            {availableRooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.floor ? `Khu ${r.floor} - ` : ''}{r.name} — {r.price.toLocaleString('vi-VN')}đ/tháng
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

      <div className="space-y-1.5">
        <Label htmlFor="deposit">Tiền cọc</Label>
        <div className="relative">
          <Input
            id="deposit"
            type="text"
            inputMode="numeric"
            placeholder="VD: 1,000,000"
            value={form.deposit}
            onChange={(e) => setForm({ ...form, deposit: formatVND(e.target.value) })}
            className="pr-7"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">đ</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Hủy
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Đang lưu...' : reactivateId ? 'Tái kích hoạt' : isEdit ? (tenant.is_active ? 'Cập nhật' : 'Tái kích hoạt') : 'Thêm người thuê'}
        </Button>
      </div>
    </form>
  )
}
