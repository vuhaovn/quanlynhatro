'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { Room, Tenant, Settings } from '@/types/database'
import { Loader2 } from 'lucide-react'

interface RoomWithTenant extends Room {
  tenant: Tenant | null
}

interface InvoiceRow {
  room_id: string
  tenant_id: string
  zone: number | null
  room_name: string
  tenant_name: string
  room_price: number
  electric_start: string
  electric_end: string
  electric_price: string
  water_start: string
  water_end: string
  water_price: string
  garbage_fee: number
  internet_fee: number
  note: string
  included: boolean
}

interface Props {
  rooms: RoomWithTenant[]
  settings: Settings | null
}

function n(v: string | number) { return Number(v) || 0 }
function fmt(v: number) { return v.toLocaleString('vi-VN') }

function rowTotal(row: InvoiceRow) {
  const elec = Math.round(Math.max(0, n(row.electric_end) - n(row.electric_start)) * n(row.electric_price))
  const water = Math.round(Math.max(0, n(row.water_end) - n(row.water_start)) * n(row.water_price))
  return row.room_price + elec + water + row.garbage_fee + row.internet_fee
}

export function InvoiceForm({ rooms: allRooms, settings }: Props) {
  const router = useRouter()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())

  const rooms = allRooms.filter((r) => r.tenant !== null)

  const [rows, setRows] = useState<InvoiceRow[]>(() =>
    rooms.map((room) => ({
      room_id: room.id,
      tenant_id: room.tenant!.id,
      zone: room.floor,
      room_name: room.name,
      tenant_name: room.tenant!.full_name,
      room_price: room.price,
      electric_start: '',
      electric_end: '',
      electric_price: settings?.electric_price?.toString() ?? '3500',
      water_start: '',
      water_end: '',
      water_price: settings?.water_price?.toString() ?? '15000',
      garbage_fee: settings?.garbage_fee ?? 0,
      internet_fee: settings?.internet_fee ?? 0,
      note: '',
      included: true,
    }))
  )

  useEffect(() => {
    const supabase = createClient()
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year

    Promise.all([
      supabase.from('invoices').select('room_id').eq('month', month).eq('year', year),
      supabase.from('invoices').select('room_id, electric_end, water_end, internet_fee').eq('month', prevMonth).eq('year', prevYear),
    ]).then(([{ data: current }, { data: prev }]) => {
      setExistingIds(new Set((current ?? []).map((d: { room_id: string }) => d.room_id)))

      const prevMap = new Map<string, { electric_end: number | null; water_end: number | null; internet_fee: number | null }>()
      for (const inv of (prev ?? []) as { room_id: string; electric_end: number | null; water_end: number | null; internet_fee: number | null }[]) {
        prevMap.set(inv.room_id, { electric_end: inv.electric_end, water_end: inv.water_end, internet_fee: inv.internet_fee })
      }

      setRows((current) =>
        current.map((row) => {
          const p = prevMap.get(row.room_id)
          return {
            ...row,
            electric_start: p?.electric_end != null ? p.electric_end.toString() : '',
            electric_end: '',
            water_start: p?.water_end != null ? p.water_end.toString() : '',
            water_end: '',
            internet_fee: p?.internet_fee != null ? p.internet_fee : row.internet_fee,
          }
        })
      )
    })
  }, [month, year])

  function update<K extends keyof InvoiceRow>(i: number, k: K, v: InvoiceRow[K]) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)))
  }

  const availableRows = rows.filter((r) => !existingIds.has(r.room_id))
  const includedRows = availableRows.filter((r) => r.included)
  const allChecked = availableRows.length > 0 && availableRows.every((r) => r.included)
  const someChecked = availableRows.some((r) => r.included)
  const grandTotal = includedRows.reduce((sum, r) => sum + rowTotal(r), 0)

  async function handleSubmit() {
    if (!includedRows.length) { toast.error('Không có phòng nào được chọn'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let created = 0, failed = 0
    for (const row of includedRows) {
      const { error } = await supabase.from('invoices').insert({
        user_id: user!.id,
        room_id: row.room_id,
        tenant_id: row.tenant_id,
        month, year,
        room_price: row.room_price,
        electric_start: n(row.electric_start),
        electric_end: n(row.electric_end),
        electric_price: n(row.electric_price),
        water_start: n(row.water_start),
        water_end: n(row.water_end),
        water_price: n(row.water_price),
        garbage_fee: row.garbage_fee,
        internet_fee: row.internet_fee,
        note: row.note || null,
        is_paid: false,
      })
      if (error) failed++; else created++
    }

    setLoading(false)
    if (created > 0) {
      toast.success(`Đã tạo ${created} hóa đơn${failed ? ` · ${failed} lỗi` : ''}`)
      router.refresh()
      router.push('/invoices')
    } else {
      toast.error(`Tạo thất bại · ${failed} lỗi`)
    }
  }

  const TH = 'border-b border-r border-border px-2 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap bg-muted/50 text-center'
  const TD = 'border-b border-r border-border'
  const INP = 'w-full h-8 text-right text-sm px-1.5 bg-transparent focus:bg-primary/5 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v ?? '1'))}>
          <SelectTrigger className="w-[110px]">
            <span className="flex flex-1 text-left text-sm">Tháng {month}</span>
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v ?? String(now.getFullYear())))}>
          <SelectTrigger className="w-[85px]">
            <span className="flex flex-1 text-left text-sm">{year}</span>
          </SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {includedRows.length} phòng · <strong>{fmt(grandTotal)}đ</strong>
          </span>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !includedRows.length}>
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : `Tạo ${includedRows.length} hóa đơn`}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="border-separate border-spacing-0" style={{ minWidth: 1180 }}>
          <thead>
            <tr>
              <th className={`${TH} sticky left-0 z-20 text-left`} style={{ width: 168, minWidth: 168 }}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked }}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) => existingIds.has(r.room_id) ? r : { ...r, included: e.target.checked })
                      )
                    }
                    className="rounded"
                  />
                  Khu · Phòng
                </div>
              </th>
              <th className={TH} style={{ width: 94 }}>Tiền phòng</th>
              <th className={TH} style={{ width: 76 }}>Đ.đầu</th>
              <th className={TH} style={{ width: 76 }}>Đ.cuối</th>
              <th className={TH} style={{ width: 76 }}>đ/kWh</th>
              <th className={`${TH} text-amber-700 bg-amber-50`} style={{ width: 84 }}>= Điện</th>
              <th className={TH} style={{ width: 76 }}>N.đầu</th>
              <th className={TH} style={{ width: 76 }}>N.cuối</th>
              <th className={TH} style={{ width: 76 }}>đ/m³</th>
              <th className={`${TH} text-blue-700 bg-blue-50`} style={{ width: 84 }}>= Nước</th>
              <th className={TH} style={{ width: 76 }}>Rác</th>
              <th className={TH} style={{ width: 76 }}>Mạng</th>
              <th className={`${TH} text-green-700 bg-green-50`} style={{ width: 98 }}>Tổng</th>
              <th className={`${TH} border-r-0`} style={{ width: 128 }}>Ghi chú</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => {
              const isExisting = existingIds.has(row.room_id)
              const disabled = isExisting || !row.included
              const elecTotal = Math.round(Math.max(0, n(row.electric_end) - n(row.electric_start)) * n(row.electric_price))
              const waterTotal = Math.round(Math.max(0, n(row.water_end) - n(row.water_start)) * n(row.water_price))
              const total = rowTotal(row)

              return (
                <tr
                  key={row.room_id}
                  className={`transition-colors ${disabled ? 'opacity-40' : 'hover:bg-muted/20'}`}
                >
                  {/* Sticky: checkbox + room info */}
                  <td
                    className={`${TD} sticky left-0 z-10 bg-card px-2 py-1 shadow-[1px_0_0_0_hsl(var(--border))]`}
                    style={{ width: 168 }}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.included && !isExisting}
                        disabled={isExisting}
                        onChange={(e) => update(i, 'included', e.target.checked)}
                        className="rounded shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <p className="font-medium text-xs leading-tight">
                            {row.zone ? `Khu ${row.zone} · ` : ''}{row.room_name}
                          </p>
                          {isExisting && (
                            <Badge variant="outline" className="text-[10px] px-1 h-4 py-0 leading-none shrink-0">
                              Đã tạo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{row.tenant_name}</p>
                      </div>
                    </div>
                  </td>

                  {/* Tiền phòng */}
                  <td className={TD}>
                    <input type="number" value={row.room_price} disabled={isExisting}
                      onChange={(e) => update(i, 'room_price', Number(e.target.value))}
                      className={INP} />
                  </td>

                  {/* Điện đầu */}
                  <td className={TD}>
                    <input type="number" value={row.electric_start} disabled={isExisting}
                      onChange={(e) => update(i, 'electric_start', e.target.value)}
                      placeholder="—" className={INP} />
                  </td>

                  {/* Điện cuối */}
                  <td className={TD}>
                    <input type="number" value={row.electric_end} disabled={isExisting}
                      onChange={(e) => update(i, 'electric_end', e.target.value)}
                      placeholder="—" className={INP} />
                  </td>

                  {/* Giá điện */}
                  <td className={TD}>
                    <input type="number" value={row.electric_price} disabled={isExisting}
                      onChange={(e) => update(i, 'electric_price', e.target.value)}
                      className={INP} />
                  </td>

                  {/* = Điện */}
                  <td className={`${TD} bg-amber-50 text-right px-2 text-xs font-medium text-amber-800`}>
                    {elecTotal > 0 ? fmt(elecTotal) : '—'}
                  </td>

                  {/* Nước đầu */}
                  <td className={TD}>
                    <input type="number" value={row.water_start} disabled={isExisting}
                      onChange={(e) => update(i, 'water_start', e.target.value)}
                      placeholder="—" className={INP} />
                  </td>

                  {/* Nước cuối */}
                  <td className={TD}>
                    <input type="number" value={row.water_end} disabled={isExisting}
                      onChange={(e) => update(i, 'water_end', e.target.value)}
                      placeholder="—" className={INP} />
                  </td>

                  {/* Giá nước */}
                  <td className={TD}>
                    <input type="number" value={row.water_price} disabled={isExisting}
                      onChange={(e) => update(i, 'water_price', e.target.value)}
                      className={INP} />
                  </td>

                  {/* = Nước */}
                  <td className={`${TD} bg-blue-50 text-right px-2 text-xs font-medium text-blue-800`}>
                    {waterTotal > 0 ? fmt(waterTotal) : '—'}
                  </td>

                  {/* Rác */}
                  <td className={TD}>
                    <input type="number" value={row.garbage_fee} disabled={isExisting}
                      onChange={(e) => update(i, 'garbage_fee', Number(e.target.value))}
                      className={INP} />
                  </td>

                  {/* Mạng */}
                  <td className={TD}>
                    <input type="number" value={row.internet_fee} disabled={isExisting}
                      onChange={(e) => update(i, 'internet_fee', Number(e.target.value))}
                      className={INP} />
                  </td>

                  {/* Tổng */}
                  <td className={`${TD} bg-green-50 text-right px-2 text-xs font-bold text-green-800`}>
                    {fmt(total)}
                  </td>

                  {/* Ghi chú */}
                  <td className={`${TD} border-r-0`}>
                    <input type="text" value={row.note} disabled={isExisting}
                      onChange={(e) => update(i, 'note', e.target.value)}
                      placeholder="..." className={`${INP} text-left`} />
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Footer */}
          <tfoot>
            <tr>
              <td className="sticky left-0 z-10 bg-muted/50 border-t border-r border-border px-3 py-2 text-xs font-semibold">
                {includedRows.length}/{rows.length} phòng
              </td>
              <td colSpan={11} className="border-t border-r border-border bg-muted/50" />
              <td className="border-t border-r border-border bg-green-50 px-2 py-2 text-right text-xs font-bold text-green-800">
                {fmt(grandTotal)}đ
              </td>
              <td className="border-t border-border bg-muted/50" />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Phòng đã có hóa đơn tháng {month}/{year} sẽ bị bỏ qua tự động.
      </p>
    </div>
  )
}
