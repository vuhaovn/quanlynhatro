import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Room } from '@/types/database'
import { TenantForm } from '../_components/tenant-form'

export default async function NewTenantPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('rooms').select('*').order('name')
  const rooms = (data ?? []) as Room[]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/tenants" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Thêm người thuê</h1>
      </div>

      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm text-muted-foreground">Thông tin người thuê</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <TenantForm rooms={rooms} />
        </CardContent>
      </Card>
    </div>
  )
}
