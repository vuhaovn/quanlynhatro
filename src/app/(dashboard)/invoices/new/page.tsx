import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Room, Tenant, Settings } from '@/types/database'
import { InvoiceForm } from '../_components/invoice-form'

export default async function NewInvoicePage() {
  const supabase = await createClient()

  const [roomsRes, tenantsRes, settingsRes] = await Promise.all([
    supabase.from('rooms').select('*').eq('status', 'rented').order('name'),
    supabase.from('tenants').select('*').eq('is_active', true),
    supabase.from('settings').select('*').single(),
  ])

  const rooms = (roomsRes.data ?? []) as Room[]
  const tenants = (tenantsRes.data ?? []) as Tenant[]
  const settings = settingsRes.data as Settings | null

  // Join tenant into room
  const roomsWithTenant = rooms.map((room) => ({
    ...room,
    tenant: tenants.find((t) => t.room_id === room.id) ?? null,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Tạo hóa đơn</h1>
      </div>

      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm text-muted-foreground">Thông tin hóa đơn</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <InvoiceForm rooms={roomsWithTenant} settings={settings} />
        </CardContent>
      </Card>
    </div>
  )
}
