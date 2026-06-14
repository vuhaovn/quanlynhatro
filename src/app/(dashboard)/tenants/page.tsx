import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { FileUp, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { Tenant, Room } from '@/types/database'
import { TenantsList } from './_components/tenants-list'

type TenantWithRoom = Tenant & { room: Pick<Room, 'name' | 'floor'> | null }

export default async function TenantsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tenants')
    .select('*, room:rooms(name, floor)')
    .order('full_name')

  const tenants = (data ?? []) as TenantWithRoom[]
  const active = tenants.filter((t) => t.is_active)
  const inactive = tenants.filter((t) => !t.is_active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Người thuê</h1>
        <div className="flex gap-2">
          <Link href="/tenants/import">
            <Button size="sm" variant="outline" className="gap-1.5">
              <FileUp className="h-4 w-4" />
              Import
            </Button>
          </Link>
          <Link href="/tenants/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Thêm
            </Button>
          </Link>
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có người thuê nào</p>
          <Link href="/tenants/new">
            <Button variant="outline" size="sm" className="mt-3">
              Thêm người thuê
            </Button>
          </Link>
        </div>
      ) : (
        <TenantsList active={active} inactive={inactive} />
      )}
    </div>
  )
}
