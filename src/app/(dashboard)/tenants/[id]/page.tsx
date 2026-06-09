import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Room, Tenant } from '@/types/database'
import { TenantForm } from '../_components/tenant-form'
import { TenantActions } from '../_components/tenant-actions'

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [tenantRes, roomsRes] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', id).single(),
    supabase.from('rooms').select('*').order('name'),
  ])

  if (!tenantRes.data) notFound()

  const tenant = tenantRes.data as Tenant
  const rooms = (roomsRes.data ?? []) as Room[]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/tenants" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{tenant.full_name}</h1>
      </div>

      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm text-muted-foreground">Thông tin người thuê</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <TenantForm tenant={tenant} rooms={rooms} />
        </CardContent>
      </Card>

      {tenant.is_active && tenant.room_id && (
        <TenantActions tenant={tenant} />
      )}
    </div>
  )
}
