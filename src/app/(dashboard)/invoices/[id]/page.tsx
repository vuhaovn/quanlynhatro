import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Invoice, Room, Tenant, Settings } from '@/types/database'
import { InvoiceActions } from './invoice-actions'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [invoiceRes, settingsRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase.from('settings').select('*').single(),
  ])

  if (!invoiceRes.data) notFound()
  const invoice = invoiceRes.data as Invoice
  const settings = settingsRes.data as Settings | null

  const [roomRes, tenantRes] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', invoice.room_id).single(),
    supabase.from('tenants').select('*').eq('id', invoice.tenant_id).single(),
  ])

  const room = roomRes.data as Room | null
  const tenant = tenantRes.data as Tenant | null

  const electricUsage = invoice.electric_end - invoice.electric_start
  const waterUsage = invoice.water_end - invoice.water_start

  return (
    <>
      {/* Screen view */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {room?.name} — Tháng {invoice.month}/{invoice.year}
            </h1>
            <Badge
              variant={invoice.is_paid ? 'default' : 'outline'}
              className={invoice.is_paid ? 'bg-green-500 text-xs mt-0.5' : 'text-orange-600 border-orange-300 text-xs mt-0.5'}
            >
              {invoice.is_paid ? 'Đã thu' : 'Chưa thu'}
            </Badge>
          </div>
        </div>

        {/* Tenant info */}
        {tenant && (
          <div className="rounded-lg border px-4 py-3 space-y-0.5">
            <p className="font-medium">{tenant.full_name}</p>
            <p className="text-xs text-muted-foreground">{tenant.phone}</p>
          </div>
        )}

        {/* Invoice breakdown */}
        <div className="rounded-lg border divide-y">
          <div className="flex justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Tiền phòng</span>
            <span className="font-medium">{invoice.room_price.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">⚡ Điện</span>
              <span className="font-medium">{invoice.electric_total.toLocaleString('vi-VN')}đ</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {invoice.electric_start} → {invoice.electric_end} ({electricUsage} kWh × {invoice.electric_price.toLocaleString('vi-VN')}đ)
            </p>
          </div>
          <div className="px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">💧 Nước</span>
              <span className="font-medium">{invoice.water_total.toLocaleString('vi-VN')}đ</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {invoice.water_start} → {invoice.water_end} ({waterUsage} m³ × {invoice.water_price.toLocaleString('vi-VN')}đ)
            </p>
          </div>
          <div className="flex justify-between px-4 py-3 font-bold">
            <span>Tổng cộng</span>
            <span className="text-lg">{invoice.total_amount.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>

        {invoice.note && (
          <p className="text-sm text-muted-foreground italic px-1">Ghi chú: {invoice.note}</p>
        )}

        {invoice.is_paid && invoice.paid_at && (
          <p className="text-xs text-green-600 px-1">
            Đã thu ngày {new Date(invoice.paid_at).toLocaleDateString('vi-VN')}
          </p>
        )}

        <InvoiceActions invoice={invoice} />
      </div>

      {/* Print view — only shown when printing */}
      <div className="hidden print:block p-6 text-sm font-['Arial',sans-serif]">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase">Hóa Đơn Tiền Nhà</h1>
          <p className="text-gray-600">Tháng {invoice.month} năm {invoice.year}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p><strong>Phòng:</strong> {room?.name}</p>
            <p><strong>Người thuê:</strong> {tenant?.full_name}</p>
            <p><strong>Điện thoại:</strong> {tenant?.phone}</p>
          </div>
          <div className="text-right">
            {settings?.bank_name && <p><strong>Ngân hàng:</strong> {settings.bank_name}</p>}
            {settings?.bank_account && <p><strong>STK:</strong> {settings.bank_account}</p>}
            {settings?.bank_owner && <p><strong>Chủ TK:</strong> {settings.bank_owner}</p>}
          </div>
        </div>

        <Separator className="my-4" />

        <table className="w-full text-sm mb-4">
          <tbody>
            <tr>
              <td className="py-1">Tiền phòng</td>
              <td className="text-right">{invoice.room_price.toLocaleString('vi-VN')}đ</td>
            </tr>
            <tr>
              <td className="py-1">
                Tiền điện ({invoice.electric_start} → {invoice.electric_end} = {electricUsage} kWh × {invoice.electric_price.toLocaleString('vi-VN')}đ)
              </td>
              <td className="text-right">{invoice.electric_total.toLocaleString('vi-VN')}đ</td>
            </tr>
            <tr>
              <td className="py-1">
                Tiền nước ({invoice.water_start} → {invoice.water_end} = {waterUsage} m³ × {invoice.water_price.toLocaleString('vi-VN')}đ)
              </td>
              <td className="text-right">{invoice.water_total.toLocaleString('vi-VN')}đ</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t font-bold text-base">
              <td className="pt-2">TỔNG CỘNG</td>
              <td className="pt-2 text-right">{invoice.total_amount.toLocaleString('vi-VN')}đ</td>
            </tr>
          </tfoot>
        </table>

        {invoice.note && <p className="text-gray-600 italic mb-4">Ghi chú: {invoice.note}</p>}

        <p className="text-center text-gray-500 text-xs mt-8">
          Ngày in: {new Date().toLocaleDateString('vi-VN')}
        </p>
      </div>
    </>
  )
}
