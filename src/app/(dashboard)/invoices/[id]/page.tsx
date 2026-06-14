import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Invoice, Room, Tenant, Settings } from '@/types/database'
import { InvoiceActions } from './invoice-actions'

function fmt(n: number) { return n.toLocaleString('vi-VN') }

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
  const roomLabel = room
    ? (room.floor ? `Khu ${room.floor} · ${room.name}` : room.name)
    : 'Phòng không xác định'

  return (
    <>
      {/* ── Screen view ── */}
      <div className="space-y-3 print:hidden max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight truncate">
              {roomLabel} — Tháng {invoice.month}/{invoice.year}
            </h1>
          </div>
          <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
            invoice.is_paid
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-50 text-orange-600 border border-orange-200'
          }`}>
            {invoice.is_paid ? 'Đã thu' : 'Chưa thu'}
          </span>
        </div>

        {/* Tenant card */}
        {tenant && (
          <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{tenant.full_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tenant.phone}</p>
            </div>
            <Link
              href={`/tenants/${tenant.id}`}
              className="text-xs text-primary hover:underline shrink-0 ml-3"
            >
              Xem hồ sơ
            </Link>
          </div>
        )}

        {/* Breakdown card */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Tiền phòng */}
          <div className="flex justify-between items-center px-4 py-3 text-sm">
            <span className="text-muted-foreground">Tiền phòng</span>
            <span className="font-medium">{fmt(invoice.room_price)}đ</span>
          </div>

          <div className="border-t mx-4" />

          {/* Điện */}
          <div className="px-4 py-3 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-muted-foreground">⚡ Điện</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {invoice.electric_start} → {invoice.electric_end} ({electricUsage} kWh × {fmt(invoice.electric_price)}đ)
                </p>
              </div>
              <span className="font-medium ml-4 shrink-0">{fmt(invoice.electric_total)}đ</span>
            </div>
          </div>

          <div className="border-t mx-4" />

          {/* Nước */}
          <div className="px-4 py-3 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-muted-foreground">💧 Nước</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {invoice.water_start} → {invoice.water_end} ({waterUsage} m³ × {fmt(invoice.water_price)}đ)
                </p>
              </div>
              <span className="font-medium ml-4 shrink-0">{fmt(invoice.water_total)}đ</span>
            </div>
          </div>

          {invoice.garbage_fee > 0 && (
            <>
              <div className="border-t mx-4" />
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground">🗑️ Rác</span>
                <span className="font-medium">{fmt(invoice.garbage_fee)}đ</span>
              </div>
            </>
          )}

          {invoice.internet_fee > 0 && (
            <>
              <div className="border-t mx-4" />
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground">📶 Mạng</span>
                <span className="font-medium">{fmt(invoice.internet_fee)}đ</span>
              </div>
            </>
          )}

          {/* Total */}
          <div className="border-t bg-muted/30 flex justify-between items-center px-4 py-3.5">
            <span className="font-bold text-sm">Tổng cộng</span>
            <span className="font-bold text-xl text-green-700">{fmt(invoice.total_amount)}đ</span>
          </div>
        </div>

        {/* Meta */}
        {(invoice.note || (invoice.is_paid && invoice.paid_at)) && (
          <div className="px-1 space-y-1">
            {invoice.note && (
              <p className="text-sm text-muted-foreground italic">Ghi chú: {invoice.note}</p>
            )}
            {invoice.is_paid && invoice.paid_at && (
              <p className="text-xs text-green-600">
                Thu ngày {new Date(invoice.paid_at).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>
        )}

        <InvoiceActions invoice={invoice} />
      </div>

      {/* ── Print view ── */}
      <div className="hidden print:block p-6 text-sm font-['Arial',sans-serif]">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase">Hóa Đơn Tiền Nhà</h1>
          <p className="text-gray-600">Tháng {invoice.month} năm {invoice.year}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p><strong>Phòng:</strong> {roomLabel}</p>
            <p><strong>Người thuê:</strong> {tenant?.full_name}</p>
            <p><strong>Điện thoại:</strong> {tenant?.phone}</p>
          </div>
          {!settings?.qr_image_url && (
            <div className="text-right">
              {settings?.bank_name && <p><strong>Ngân hàng:</strong> {settings.bank_name}</p>}
              {settings?.bank_account && <p><strong>STK:</strong> {settings.bank_account}</p>}
              {settings?.bank_owner && <p><strong>Chủ TK:</strong> {settings.bank_owner}</p>}
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <table className="w-full text-sm mb-4">
          <tbody>
            <tr>
              <td className="py-1">Tiền phòng</td>
              <td className="text-right">{fmt(invoice.room_price)}đ</td>
            </tr>
            <tr>
              <td className="py-1">
                Tiền điện ({invoice.electric_start} → {invoice.electric_end} = {electricUsage} kWh × {fmt(invoice.electric_price)}đ)
              </td>
              <td className="text-right">{fmt(invoice.electric_total)}đ</td>
            </tr>
            <tr>
              <td className="py-1">
                Tiền nước ({invoice.water_start} → {invoice.water_end} = {waterUsage} m³ × {fmt(invoice.water_price)}đ)
              </td>
              <td className="text-right">{fmt(invoice.water_total)}đ</td>
            </tr>
            {invoice.garbage_fee > 0 && (
              <tr>
                <td className="py-1">Tiền rác</td>
                <td className="text-right">{fmt(invoice.garbage_fee)}đ</td>
              </tr>
            )}
            {invoice.internet_fee > 0 && (
              <tr>
                <td className="py-1">Cáp mạng</td>
                <td className="text-right">{fmt(invoice.internet_fee)}đ</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t font-bold text-base">
              <td className="pt-2">TỔNG CỘNG</td>
              <td className="pt-2 text-right">{fmt(invoice.total_amount)}đ</td>
            </tr>
          </tfoot>
        </table>

        {settings?.qr_image_url && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.qr_image_url}
              alt="QR"
              style={{ width: '130px', height: '130px', objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{ fontSize: '13px', lineHeight: '1.7' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Chuyển khoản:</p>
              {settings.bank_name && <p>{settings.bank_name}</p>}
              {settings.bank_account && <p>STK: <strong>{settings.bank_account}</strong></p>}
              {settings.bank_owner && <p>{settings.bank_owner}</p>}
            </div>
          </div>
        )}

        {invoice.note && <p className="text-gray-600 italic mb-4 mt-3">Ghi chú: {invoice.note}</p>}

        <p className="text-center text-gray-500 text-xs mt-8">
          Ngày in: {new Date().toLocaleDateString('vi-VN')}
        </p>
      </div>
    </>
  )
}
