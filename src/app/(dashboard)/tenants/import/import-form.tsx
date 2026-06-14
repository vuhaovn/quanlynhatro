'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Upload, CheckCircle, XCircle, Loader2, RotateCcw } from 'lucide-react'

interface Room {
  id: string
  name: string
  floor: number | null
}

interface ParsedRow {
  full_name: string
  phone: string
  cccd: string
  room_name: string
  room_id: string | null
  start_date: string
  gender: string
  date_of_birth: string
  hometown: string
  workplace: string
  temp_residence: boolean | null
  ethnicity: string
  religion: string
  occupation: string
  sheet: string
}

interface Props {
  rooms: Room[]
}

function normalizeDate(value: unknown): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().split('T')[0]
  const str = String(value).trim()
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  return ''
}

function findCol(row: Record<string, unknown>, keywords: string[]): string {
  for (const key of Object.keys(row)) {
    const k = key.toLowerCase()
    if (keywords.some((kw) => k.includes(kw.toLowerCase()))) {
      return String(row[key] ?? '').trim()
    }
  }
  return ''
}

function findColRaw(row: Record<string, unknown>, keywords: string[]): unknown {
  for (const key of Object.keys(row)) {
    const k = key.toLowerCase()
    if (keywords.some((kw) => k.includes(kw.toLowerCase()))) {
      return row[key]
    }
  }
  return ''
}

export function ImportForm({ rooms }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // raw parsed rows (before zone matching)
  const [rawRows, setRawRows] = useState<{ full_name: string; phone: string; cccd: string; room_name: string; start_date: string; gender: string; date_of_birth: string; hometown: string; workplace: string; temp_residence: boolean | null; ethnicity: string; religion: string; occupation: string; sheet: string }[] | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  // zone number per sheet name
  const [zoneMap, setZoneMap] = useState<Record<string, string>>({})

  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)

  function parseFile(file: File) {
    setReading(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary', cellDates: true })
        const all: typeof rawRows = []
        const names: string[] = []
        const autoZone: Record<string, string> = {}

        for (const sheetName of wb.SheetNames) {
          names.push(sheetName)
          // auto-fill zone from sheet name if it's a number
          const num = sheetName.replace(/\D/g, '')
          autoZone[sheetName] = num || ''

          const ws = wb.Sheets[sheetName]
          const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

          for (const row of data) {
            const full_name = findCol(row, ['họ và tên', 'họ tên', 'tên'])
            if (!full_name) continue

            const phone = findCol(row, ['điện thoại', 'sdt'])
              .replace(/[\s\-\.]/g, '').replace(/^\+84/, '0')
            const cccd = findCol(row, ['cccd', 'cmnd', 'căn cước']).replace(/\s/g, '')
            const room_name = findCol(row, ['số phòng', 'phòng'])
            const start_date = normalizeDate(findColRaw(row, ['thời gian', 'bắt đầu', 'ngày vào']))
            const gender = findCol(row, ['giới tính'])
            const date_of_birth = normalizeDate(findColRaw(row, ['ngày tháng năm sinh', 'ngày sinh', 'sinh']))
            const hometown = findCol(row, ['hộ khẩu', 'thường trú', 'địa danh'])
            const workplace = findCol(row, ['nơi làm việc', 'công ty'])
            const tempRaw = findCol(row, ['tạm trú']).toLowerCase()
            const temp_residence = tempRaw === 'có' ? true : tempRaw === 'không' ? false : null
            const ethnicity = findCol(row, ['dân tộc'])
            const religion = findCol(row, ['tôn giáo'])
            const occupation = findCol(row, ['công việc'])

            all!.push({ full_name, phone, cccd, room_name, start_date, gender, date_of_birth, hometown, workplace, temp_residence, ethnicity, religion, occupation, sheet: sheetName })
          }
        }

        setRawRows(all)
        setSheetNames(names)
        setZoneMap(autoZone)
      } catch {
        toast.error('Không đọc được file. Hãy đảm bảo file là .xlsx hoặc .xls')
      } finally {
        setReading(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  // resolve room_id by matching name + zone
  function resolveRows(): ParsedRow[] {
    if (!rawRows) return []
    return rawRows.map((r) => {
      const zone = Number(zoneMap[r.sheet])
      const matched = rooms.find((room) => {
        const nameMatch = room.name.toLowerCase().trim() === r.room_name.toLowerCase().trim()
        if (!nameMatch) return false
        if (!zone) return true
        return room.floor === zone
      })
      return { ...r, room_id: matched?.id ?? null } as ParsedRow
    })
  }

  async function handleImport() {
    const rows = resolveRows()
    const valid = rows.filter((r) => r.room_id && r.full_name)
    if (!valid.length) { toast.error('Không có dòng hợp lệ'); return }

    setImporting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const payload = valid.map((t) => ({
      user_id: user!.id,
      full_name: t.full_name,
      phone: t.phone || '000000000',
      cccd: t.cccd || '000000000',
      room_id: t.room_id,
      start_date: t.start_date || new Date().toISOString().split('T')[0],
      deposit: 0,
      is_active: true,
      gender: t.gender || null,
      date_of_birth: t.date_of_birth || null,
      hometown: t.hometown || null,
      workplace: t.workplace || null,
      temp_residence: t.temp_residence,
      ethnicity: t.ethnicity || null,
      religion: t.religion || null,
      occupation: t.occupation || null,
    }))

    const { error } = await supabase.from('tenants').insert(payload)
    if (error) {
      toast.error('Lỗi import: ' + error.message)
      setImporting(false)
      return
    }

    const roomIds = [...new Set(valid.map((t) => t.room_id!))]
    await Promise.all(roomIds.map((id) => supabase.from('rooms').update({ status: 'rented' }).eq('id', id)))

    toast.success(`Đã import ${valid.length} người thuê`)
    router.refresh()
    router.push('/tenants')
  }

  const rows = resolveRows()
  const matched = rows.filter((r) => r.room_id)
  const unmatched = rows.filter((r) => !r.room_id)

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Nhấn để chọn file Excel</p>
        <p className="text-xs text-muted-foreground mt-1">.xlsx hoặc .xls — đọc cả 3 sheet</p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) parseFile(e.target.files[0]) }}
        />
      </div>

      {reading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang đọc file...
        </div>
      )}

      {rawRows && !reading && (
        <>
          {/* Zone mapping per sheet */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Mỗi sheet thuộc khu nào?
            </p>
            {sheetNames.map((name) => (
              <div key={name} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground shrink-0">Sheet &quot;{name}&quot;</span>
                <span className="text-muted-foreground">→ Khu</span>
                <Input
                  type="number"
                  className="h-7 w-24 text-sm"
                  placeholder="VD: 74"
                  value={zoneMap[name] ?? ''}
                  onChange={(e) => setZoneMap({ ...zoneMap, [name]: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle className="h-4 w-4" />
              {matched.length} hàng hợp lệ
            </span>
            {unmatched.length > 0 && (
              <span className="flex items-center gap-1.5 text-red-500">
                <XCircle className="h-4 w-4" />
                {unmatched.length} không khớp phòng
              </span>
            )}
          </div>

          <div className="overflow-auto rounded-lg border text-sm max-h-[420px]">
            <table className="w-full min-w-[640px]">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Họ tên</th>
                  <th className="px-3 py-2 text-left font-medium">SĐT</th>
                  <th className="px-3 py-2 text-left font-medium">CCCD</th>
                  <th className="px-3 py-2 text-left font-medium">Khu - Phòng</th>
                  <th className="px-3 py-2 text-left font-medium">Ngày vào</th>
                  <th className="px-3 py-2 text-left font-medium">Sheet</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-t ${!r.room_id ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2">{r.full_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.phone || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.cccd || '—'}</td>
                    <td className="px-3 py-2">
                      {r.room_id ? (
                        <span className="text-green-600 font-medium">
                          {zoneMap[r.sheet] ? `Khu ${zoneMap[r.sheet]} - ` : ''}{r.room_name}
                        </span>
                      ) : (
                        <span className="text-red-500">{r.room_name || '(trống)'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.start_date || '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.sheet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {unmatched.length > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              Dòng đỏ sẽ bị bỏ qua — tên phòng hoặc số khu không khớp. Đảm bảo phòng đã được tạo trong hệ thống với đúng Khu và tên phòng.
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => { setRawRows(null); setSheetNames([]); setZoneMap({}); if (fileRef.current) fileRef.current.value = '' }}
            >
              <RotateCcw className="h-4 w-4" />
              Chọn lại
            </Button>
            <Button
              className="flex-1"
              onClick={handleImport}
              disabled={importing || matched.length === 0}
            >
              {importing
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang import...</>
                : `Import ${matched.length} người thuê`
              }
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
