import { createClient } from '@/lib/supabase/server'
import { Room } from '@/types/database'
import { ImportForm } from './import-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ImportTenantsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('rooms').select('id, name, floor').order('floor').order('name')
  const rooms = (data ?? []) as Pick<Room, 'id' | 'name' | 'floor'>[]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/tenants" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Import từ Excel</h1>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <ImportForm rooms={rooms} />
      </div>
    </div>
  )
}
