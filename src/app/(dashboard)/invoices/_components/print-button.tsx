'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

export function PrintButton() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  function handlePrint() {
    window.open(`/invoices/print?month=${month}&year=${year}`, '_blank')
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" />
        }
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">In tháng</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>In hóa đơn theo tháng</DialogTitle>
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
          <Button className="gap-1.5 w-full sm:w-auto" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Xem trước &amp; In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
