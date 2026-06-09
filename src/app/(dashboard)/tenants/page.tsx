import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { Tenant, Room } from '@/types/database'

type TenantWithRoom = Tenant & { room: Pick<Room, 'name'> | null }

export default async function TenantsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tenants')
    .select('*, room:rooms(name)')
    .order('full_name')

  const tenants = (data ?? []) as TenantWithRoom[]
  const active = tenants.filter((t) => t.is_active)
  const inactive = tenants.filter((t) => !t.is_active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Người thuê</h1>
        <Link href="/tenants/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Thêm
          </Button>
        </Link>
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
        <div className="space-y-4">
          {active.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Đang thuê ({active.length})
              </p>
              <div className="space-y-2">
                {active.map((tenant) => (
                  <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{tenant.full_name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.phone}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                            {tenant.room?.name ?? 'Chưa gán phòng'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Đã rời ({inactive.length})
              </p>
              <div className="space-y-2">
                {inactive.map((tenant) => (
                  <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-60">
                      <CardContent className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{tenant.full_name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.phone}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">Đã rời</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
