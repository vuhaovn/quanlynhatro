import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'
import { SettingsForm } from './settings-form'
import { LogoutButton } from './logout-button'
import { Settings as SettingsType } from '@/types/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('*').maybeSingle()
  const settings = data as SettingsType | null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h1 className="text-xl font-bold">Cài đặt</h1>
      </div>

      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm">Giá điện & nước</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Card className="md:hidden">
        <CardContent className="px-4 py-3">
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  )
}
