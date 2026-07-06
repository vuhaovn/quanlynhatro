"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Invoice, Room } from '@/types/database'

// Import các Select component có sẵn của dự án
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/components/ui/select' // Bạn điều chỉnh lại đường dẫn này cho đúng với dự án nhé

type InvoiceWithRoom = Invoice & { room: Pick<Room, 'name' | 'floor'> | null }

interface ExcelExportButtonProps {
  invoices: InvoiceWithRoom[]
}

type ExcelRowData = {
  'Khu · Phòng': string;
  'Tiền phòng': number | string;
  'Đ.đầu': number | string;
  'Đ.cuối': number | string;
  'kWh': number | string;
  'đ/kWh': number | string;
  '= Điện': number | string;
  'N.đầu': number | string;
  'N.cuối': number | string;
  'm³': number | string;
  'đ/m³': number | string;
  '= Nước': number | string;
  'Rác': number | string;
  'Mạng': number | string;
  'Tổng': number | string;
  'Ghi chú': string;
}

function n(v: string | number) { return Number(v) || 0 }
function fmt(v: number) { return v.toLocaleString('vi-VN') }

function rowTotal(row: InvoiceWithRoom) {
  const elec = Math.round(Math.max(0, n(row.electric_end) - n(row.electric_start)) * n(row.electric_price))
  const water = Math.round(Math.max(0, n(row.water_end) - n(row.water_start)) * n(row.water_price))
  return row.room_price + elec + water + row.garbage_fee + row.internet_fee
}

export function ExcelExportButton({ invoices }: ExcelExportButtonProps) {
  // Gom các cặp Tháng/Năm duy nhất xuất hiện trong dữ liệu hóa đơn (Ví dụ: "05/2026", "04/2026")
  const availableMonths = Array.from(
    new Set(invoices.map((inv) => `${String(inv.month).padStart(2, '0')}/${inv.year}`))
  ).sort((a, b) => b.localeCompare(a)) // Sắp xếp tháng mới nhất lên đầu

  // State lưu giá trị Tháng/Năm được chọn (mặc định là tháng gần nhất)
  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || '')

  const handleExport = () => {
    if (!selectedMonth) return

    const [monthStr, yearStr] = selectedMonth.split('/')
    const month = parseInt(monthStr, 10)
    const year = parseInt(yearStr, 10)

    // Lọc dữ liệu theo Tháng và Năm đã chọn
    const filteredData = invoices.filter((inv) => inv.month === month && inv.year === year)

    // Map lại data JSON thành các cột tiếng Việt hiển thị trong file Excel
    const excelData: ExcelRowData[] = filteredData.map((inv) => ({
      'Khu · Phòng': inv.room_id ? `Khu ${inv.room.floor} · ${inv.room.name}` : '',
      'Tiền phòng': fmt(inv.room_price || 0),
      'Đ.đầu': inv.electric_start || 0,
      'Đ.cuối': inv.electric_end || 0,
      'kWh': inv.electric_end && inv.electric_start ? (n(inv.electric_end) - n(inv.electric_start)) : 0,
      'đ/kWh': inv.electric_price || 0,
      '= Điện': fmt(Math.round(Math.max(0, n(inv.electric_end) - n(inv.electric_start)) * n(inv.electric_price))),
      'N.đầu': inv.water_start || 0,
      'N.cuối': inv.water_end || 0,
      'm³': inv.water_end && inv.water_start ? (n(inv.water_end) - n(inv.water_start)) : 0,
      'đ/m³': inv.water_price || 0,
      '= Nước': fmt(Math.round(Math.max(0, n(inv.water_end) - n(inv.water_start)) * n(inv.water_price))),
      'Rác': inv.garbage_fee || 0,
      'Mạng': inv.internet_fee || 0,
      'Tổng': fmt(rowTotal(inv)),
      'Ghi chú': inv.note || '',
    }))

    const grandTotal = filteredData.reduce((sum, r) => sum + rowTotal(r), 0)
    const grandElec = filteredData.reduce((sum, r) => sum + Math.round(Math.max(0, n(r.electric_end) - n(r.electric_start)) * n(r.electric_price)), 0)
    const grandWater = filteredData.reduce((sum, r) => sum + Math.round(Math.max(0, n(r.water_end) - n(r.water_start)) * n(r.water_price)), 0)

    // Thêm một dòng mới hoàn toàn ở dưới cùng
    excelData.push({
      'Khu · Phòng': 'TỔNG CỘNG',
      'Tiền phòng': '',
      'Đ.đầu': '',
      'Đ.cuối': '',
      'kWh': '',
      'đ/kWh': '',
      '= Điện': fmt(grandElec), // Hiển thị tổng tiền điện ngay dưới cột '= Điện'
      'N.đầu': '',
      'N.cuối': '',
      'm³': '',
      'đ/m³': '',
      '= Nước': fmt(grandWater),    // Hiển thị tổng tiền nước ngay dưới cột '= Nước'
      'Rác': '',
      'Mạng': '',
      'Tổng': fmt(grandTotal),        // Hiển thị tổng tiền tất cả ngay dưới cột 'Tổng'
      'Ghi chú': '',
    }) // Ép kiểu 'as any' để tránh báo lỗi TypeScript cho các ô trống chuỗi rỗng
    // -----------------------------------------------

    // Thực hiện export file Excel qua thư viện xlsx
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, `Tháng ${selectedMonth.replace('/', '-')}`)

    XLSX.writeFile(workbook, `Hoa_Don_Thang_${selectedMonth.replace('/', '_')}.xlsx`)
  }

  if (availableMonths.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {/* Sử dụng cấu trúc Select chuẩn của dự án bạn */}
      <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v ?? '')}>
        <SelectTrigger className="h-9">
          <span className="flex flex-1 text-left text-sm">Tháng {selectedMonth}</span>
        </SelectTrigger>
        <SelectContent>
          {availableMonths.map((m) => (
            <SelectItem key={m} value={m}>
              Tháng {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleExport}>
        <Download className="h-4 w-4" />
        Xuất Excel
      </Button>
    </div>
  )
}