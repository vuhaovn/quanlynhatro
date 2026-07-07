"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { InvoiceWithRoom, sortInvoices } from '../_utils'

function roomLabel(room: InvoiceWithRoom['room']): string {
  if (!room) return ''
  return room.floor ? `Khu ${room.floor} · ${room.name}` : room.name
}

function n(v: string | number) { return Number(v) || 0 }

// Apply VND number format (#,##0) to money columns — keeps them as real numbers
// so Excel SUM still works, but displays with thousand separators
function applyMoneyFormat(worksheet: XLSX.WorkSheet, moneyCols: Set<string>) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1')
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (const col of moneyCols) {
      const addr = `${col}${R + 1}`
      const cell = worksheet[addr]
      if (cell && cell.t === 'n') {
        cell.z = '#,##0'
        delete cell.w
      }
    }
  }
}

function buildDetailRows(list: InvoiceWithRoom[]) {
  const rows = list.map((inv) => ({
    'Khu · Phòng': roomLabel(inv.room),
    'Tiền phòng': inv.room_price,
    'Đ.đầu': inv.electric_start,
    'Đ.cuối': inv.electric_end,
    'kWh': Math.max(0, n(inv.electric_end) - n(inv.electric_start)),
    'đ/kWh': inv.electric_price,
    '= Điện': inv.electric_total,
    'N.đầu': inv.water_start,
    'N.cuối': inv.water_end,
    'm³': Math.max(0, n(inv.water_end) - n(inv.water_start)),
    'đ/m³': inv.water_price,
    '= Nước': inv.water_total,
    'Rác': inv.garbage_fee,
    'Mạng': inv.internet_fee,
    'Tổng': inv.total_amount,
    'Ghi chú': inv.note || '',
  }))

  rows.push({
    'Khu · Phòng': 'TỔNG CỘNG',
    'Tiền phòng': list.reduce((s, r) => s + r.room_price, 0),
    'Đ.đầu': 0,
    'Đ.cuối': 0,
    'kWh': list.reduce((s, r) => s + Math.max(0, n(r.electric_end) - n(r.electric_start)), 0),
    'đ/kWh': 0,
    '= Điện': list.reduce((s, r) => s + r.electric_total, 0),
    'N.đầu': 0,
    'N.cuối': 0,
    'm³': list.reduce((s, r) => s + Math.max(0, n(r.water_end) - n(r.water_start)), 0),
    'đ/m³': 0,
    '= Nước': list.reduce((s, r) => s + r.water_total, 0),
    'Rác': 0,
    'Mạng': 0,
    'Tổng': list.reduce((s, r) => s + r.total_amount, 0),
    'Ghi chú': '',
  })

  return rows
}

export function ExcelExportButton({ invoices }: { invoices: InvoiceWithRoom[] }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const handleExport = () => {
    const filtered = sortInvoices(invoices.filter((inv) => inv.month === month && inv.year === year))

    const detailMoneyCols = new Set(['B', 'F', 'G', 'K', 'L', 'M', 'N', 'O'])
    const workbook = XLSX.utils.book_new()

    // Group theo khu (giữ thứ tự đã sort: khu tăng dần)
    const zoneGroups = new Map<number | null, InvoiceWithRoom[]>()
    for (const inv of filtered) {
      const zone = inv.room?.floor ?? null
      const list = zoneGroups.get(zone) ?? []
      list.push(inv)
      zoneGroups.set(zone, list)
    }

    // Sheet "Tổng hợp" — mỗi khu 1 dòng
    const summaryRows = [...zoneGroups.entries()].map(([zone, list]) => ({
      'Khu': zone != null ? `Khu ${zone}` : 'Khác',
      'Số HĐ': list.length,
      'Tiền phòng': list.reduce((s, r) => s + r.room_price, 0),
      'kWh': list.reduce((s, r) => s + Math.max(0, n(r.electric_end) - n(r.electric_start)), 0),
      '= Điện': list.reduce((s, r) => s + r.electric_total, 0),
      'm³': list.reduce((s, r) => s + Math.max(0, n(r.water_end) - n(r.water_start)), 0),
      '= Nước': list.reduce((s, r) => s + r.water_total, 0),
      'Rác': list.reduce((s, r) => s + r.garbage_fee, 0),
      'Mạng': list.reduce((s, r) => s + r.internet_fee, 0),
      'Tổng': list.reduce((s, r) => s + r.total_amount, 0),
    }))
    summaryRows.push({
      'Khu': 'TỔNG CỘNG',
      'Số HĐ': filtered.length,
      'Tiền phòng': summaryRows.reduce((s, r) => s + r['Tiền phòng'], 0),
      'kWh': summaryRows.reduce((s, r) => s + r['kWh'], 0),
      '= Điện': summaryRows.reduce((s, r) => s + r['= Điện'], 0),
      'm³': summaryRows.reduce((s, r) => s + r['m³'], 0),
      '= Nước': summaryRows.reduce((s, r) => s + r['= Nước'], 0),
      'Rác': summaryRows.reduce((s, r) => s + r['Rác'], 0),
      'Mạng': summaryRows.reduce((s, r) => s + r['Mạng'], 0),
      'Tổng': summaryRows.reduce((s, r) => s + r['Tổng'], 0),
    })
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
    applyMoneyFormat(summarySheet, new Set(['C', 'E', 'G', 'H', 'I', 'J']))
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng hợp')

    // Mỗi khu 1 sheet chi tiết
    for (const [zone, list] of zoneGroups) {
      const worksheet = XLSX.utils.json_to_sheet(buildDetailRows(list))
      applyMoneyFormat(worksheet, detailMoneyCols)
      XLSX.utils.book_append_sheet(workbook, worksheet, zone != null ? `Khu ${zone}` : 'Khác')
    }

    const monthStr = `${String(month).padStart(2, '0')}_${year}`
    XLSX.writeFile(workbook, `Hoa_Don_Thang_${monthStr}.xlsx`)
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" />
        }
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Xuất Excel</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xuất Excel theo tháng</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>Tháng</Label>
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v ?? '1'))}>
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left text-sm">Tháng {month}</span>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Năm</Label>
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v ?? String(now.getFullYear())))}>
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left text-sm">{year}</span>
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button className="gap-1.5 w-full sm:w-auto" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
