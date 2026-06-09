import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart2 } from 'lucide-react'
import { Invoice } from '@/types/database'

export default async function StatisticsPage() {
  const supabase = await createClient()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('is_paid', true)

  const invoices = (data ?? []) as Invoice[]

  const monthlyRevenue = invoices
    .filter((i) => i.year === currentYear && i.month === currentMonth)
    .reduce((sum, i) => sum + i.total_amount, 0)

  const yearlyRevenue = invoices
    .filter((i) => i.year === currentYear)
    .reduce((sum, i) => sum + i.total_amount, 0)

  const monthlyByMonth: Record<number, number> = {}
  for (let m = 1; m <= 12; m++) {
    monthlyByMonth[m] = invoices
      .filter((i) => i.year === currentYear && i.month === m)
      .reduce((sum, i) => sum + i.total_amount, 0)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-5 w-5" />
        <h1 className="text-xl font-bold">Thống kê</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground">Tháng {currentMonth}/{currentYear}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-green-600">{monthlyRevenue.toLocaleString('vi-VN')}đ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground">Cả năm {currentYear}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-blue-600">{yearlyRevenue.toLocaleString('vi-VN')}đ</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm">Doanh thu theo tháng — {currentYear}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2">
            {Object.entries(monthlyByMonth).map(([month, amount]) => {
              const max = Math.max(...Object.values(monthlyByMonth), 1)
              const pct = (amount / max) * 100
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8">T{month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-24 text-right">
                    {amount > 0 ? `${(amount / 1000).toFixed(0)}k` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
